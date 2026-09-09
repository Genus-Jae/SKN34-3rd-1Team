"""Exercise smoke-test cleanup guards with a fake Docker CLI; never touch Docker."""

from pathlib import Path
import subprocess
import tempfile
import unittest


SCRIPT = Path(__file__).with_name("verify-compose.sh")
FAKE_DOCKER = """#!/usr/bin/env bash
printf '%s\\n' "$*" >> "$VERIFY_DOCKER_CALLS"
if [[ "${VERIFY_CHECK_SAFE_UPSTREAM_ENV:-false}" == "true" ]]; then
  [[ "$KSTARTUP_SYNC_ENABLED" == "true" ]] || exit 91
  [[ "$KSTARTUP_API_BASE_URL" == "http://kstartup-stub:8003" ]] || exit 92
  [[ "$KSTARTUP_API_KEY" == "compose%2Bstartup%2Fverification%3D" ]] || exit 93
  [[ "$KSTARTUP_SYNC_SCOPE" == "RECENT_YEAR" ]] || exit 94
  [[ "$BIZINFO_API_BASE_URL" == "http://bizinfo-stub:8001" ]] || exit 95
  [[ "$OPENAI_BASE_URL" == "http://openai-stub:8002/v1" ]] || exit 96
  [[ "$OPENAI_API_KEY" == "compose-verification-key-never-sent" ]] || exit 97
fi
case "$*" in
  *" config --quiet")
    if [[ "${VERIFY_CHECK_PORTS:-false}" == "true" ]]; then
      [[ "$WEB_HOST_PORT" == "$VERIFY_EXPECTED_WEB_PORT" ]] || exit 81
      [[ "$CORE_API_HOST_PORT" == "$VERIFY_EXPECTED_CORE_PORT" ]] || exit 82
      [[ "$APP_CORS_ALLOWED_ORIGIN" == "http://127.0.0.1:$VERIFY_EXPECTED_WEB_PORT" ]] || exit 83
    fi
    exit "${VERIFY_FAKE_CONFIG_EXIT:-0}"
    ;;
  "ps "*|"network ls "*|"volume ls "*)
    if [[ "$*" == "${VERIFY_FAKE_EXISTING_KIND:-none} "* ]]; then
      printf '%s\\n' existing-resource
    fi
    exit "${VERIFY_FAKE_INSPECT_EXIT:-0}"
    ;;
  *" up --build --detach --remove-orphans") exit 42 ;;
esac
exit 0
"""


class VerifyComposeSafetyTest(unittest.TestCase):
    def run_script(self, **overrides):
        with tempfile.TemporaryDirectory(prefix="verify-compose-test-") as directory:
            root = Path(directory)
            docker = root / "docker"
            docker.write_text(FAKE_DOCKER, encoding="utf-8")
            docker.chmod(0o700)
            calls = root / "calls"
            environment = {
                "PATH": f"{root}:/usr/bin:/bin",
                "VERIFY_DOCKER_CALLS": str(calls),
                "VERIFY_COMPOSE_PROJECT_NAME": "govbiz-safety-test",
                **overrides,
            }
            result = subprocess.run(
                ["/bin/bash", str(SCRIPT)], env=environment,
                capture_output=True, text=True, timeout=10,
            )
            return result, calls.read_text(encoding="utf-8") if calls.exists() else ""

    def assert_no_stack_mutation(self, calls):
        self.assertNotIn(" up ", calls)
        self.assertNotIn(" down ", calls)
        self.assertNotIn(" logs ", calls)

    def test_existing_project_resources_are_never_reused_or_deleted(self):
        for kind in ("ps", "network ls", "volume ls"):
            with self.subTest(kind=kind):
                result, calls = self.run_script(VERIFY_FAKE_EXISTING_KIND=kind)
                self.assertNotEqual(0, result.returncode)
                self.assertIn("already has", result.stderr)
                self.assert_no_stack_mutation(calls)

    def test_resource_inspection_failure_aborts_without_cleanup(self):
        result, calls = self.run_script(VERIFY_FAKE_INSPECT_EXIT="37")
        self.assertNotEqual(0, result.returncode)
        self.assert_no_stack_mutation(calls)

    def test_invalid_config_does_not_run_cleanup(self):
        result, calls = self.run_script(VERIFY_FAKE_CONFIG_EXIT="38")
        self.assertNotEqual(0, result.returncode)
        self.assert_no_stack_mutation(calls)

    def test_partially_started_new_project_is_cleaned_up(self):
        result, calls = self.run_script()
        self.assertEqual(42, result.returncode)
        self.assertIn(" up --build --detach --remove-orphans", calls)
        self.assertIn(" down --volumes --remove-orphans", calls)

    def test_keep_running_preserves_new_project_after_failure(self):
        result, calls = self.run_script(VERIFY_COMPOSE_KEEP_RUNNING="true")
        self.assertEqual(42, result.returncode)
        self.assertIn(" up --build --detach --remove-orphans", calls)
        self.assertNotIn(" down ", calls)

    def test_verification_overrides_all_developer_upstream_settings_before_compose(self):
        result, calls = self.run_script(
            VERIFY_CHECK_SAFE_UPSTREAM_ENV="true",
            KSTARTUP_SYNC_ENABLED="false",
            KSTARTUP_API_BASE_URL="https://must-not-call.invalid",
            KSTARTUP_API_KEY="must-not-use-real-startup-key",
            KSTARTUP_SYNC_SCOPE="OPEN",
            BIZINFO_API_BASE_URL="https://must-not-call.invalid",
            OPENAI_BASE_URL="https://must-not-call.invalid/v1",
            OPENAI_API_KEY="must-not-use-real-model-key",
        )
        self.assertEqual(42, result.returncode)
        self.assertIn(" up --build --detach --remove-orphans", calls)
        self.assertIn(" down --volumes --remove-orphans", calls)

    def test_default_verification_ports_do_not_inherit_developer_service_ports(self):
        result, calls = self.run_script(
            VERIFY_CHECK_PORTS="true",
            VERIFY_EXPECTED_WEB_PORT="15173",
            VERIFY_EXPECTED_CORE_PORT="18080",
            WEB_HOST_PORT="5173",
            CORE_API_HOST_PORT="8080",
            APP_CORS_ALLOWED_ORIGIN="http://127.0.0.1:5173",
        )
        self.assertEqual(42, result.returncode)
        self.assertIn(" up --build --detach --remove-orphans", calls)

    def test_explicit_verification_ports_are_exported_with_matching_origin(self):
        result, calls = self.run_script(
            VERIFY_CHECK_PORTS="true",
            VERIFY_COMPOSE_WEB_HOST_PORT="25173",
            VERIFY_COMPOSE_CORE_API_HOST_PORT="28080",
            VERIFY_EXPECTED_WEB_PORT="25173",
            VERIFY_EXPECTED_CORE_PORT="28080",
        )
        self.assertEqual(42, result.returncode)
        self.assertIn(" up --build --detach --remove-orphans", calls)

    def test_all_http_probes_and_post_origin_use_the_verification_web_base_url(self):
        script = SCRIPT.read_text(encoding="utf-8")
        self.assertNotIn("http://127.0.0.1:5173", script)
        self.assertIn('--header "Origin: ${WEB_BASE_URL}"', script)
        for line in script.splitlines():
            if "/api/v1/" in line:
                self.assertIn("${WEB_BASE_URL}/api/v1/", line)


if __name__ == "__main__":
    unittest.main()
