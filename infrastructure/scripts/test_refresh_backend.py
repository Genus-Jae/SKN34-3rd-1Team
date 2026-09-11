"""Exercise backend refresh guards with fake Docker and curl commands."""

from pathlib import Path
import os
import subprocess
import tempfile
import unittest


SCRIPT = Path(__file__).with_name("refresh-backend.sh")
BASH = Path(os.environ.get("ProgramFiles", "C:/Program Files")) / "Git/bin/bash.exe" if os.name == "nt" else Path("/bin/bash")
FAKE_DOCKER = r"""#!/usr/bin/env bash
printf '%s\n' "$*" >> "$REFRESH_DOCKER_CALLS"
case "$*" in
  *" config --services") printf '%s\n' ${REFRESH_CONFIGURED_SERVICES-mysql qdrant ai-service core-api web};;
  "ps --all --quiet --filter label=com.docker.compose.project="*) printf '%s\n' "${REFRESH_PROJECT_CONTAINERS-container-id}";;
  *" ps --all --services") printf '%s\n' ${REFRESH_EXISTING_SERVICES-mysql qdrant ai-service core-api web};;
  *" ps --services --status running") printf '%s\n' ${REFRESH_RUNNING_SERVICES-mysql qdrant ai-service core-api web};;
  *" port web 5173") printf '%s\n' '127.0.0.1:5173';;
esac
exit 0
"""
FAKE_CURL = r"""#!/usr/bin/env bash
output=''
while (($#)); do
  if [[ "$1" == "--output" ]]; then output=$2; shift 2; else shift; fi
done
printf '%s' '{"status":"up","service":"govbiz-core-api"}{"status":"up","service":"govbiz-ai-service"}' > "$output"
printf '%s' '200'
"""


class RefreshBackendSafetyTest(unittest.TestCase):
    def run_script(self, **overrides):
        with tempfile.TemporaryDirectory(prefix="refresh-backend-test-") as directory:
            root = Path(directory)
            docker = root / "docker"
            curl = root / "curl"
            docker.write_text(FAKE_DOCKER, encoding="utf-8")
            curl.write_text(FAKE_CURL, encoding="utf-8")
            docker.chmod(0o700)
            curl.chmod(0o700)
            calls = root / "calls"
            environment = {
                "PATH": f"{root}:/usr/bin:/bin",
                "TMPDIR": root.as_posix(),
                "REFRESH_DOCKER_CALLS": str(calls),
                **overrides,
            }
            result = subprocess.run(
                [str(BASH), str(SCRIPT)],
                cwd=SCRIPT.parents[2],
                env=environment,
                capture_output=True,
                text=True,
                timeout=10,
            )
            return result, calls.read_text(encoding="utf-8") if calls.exists() else ""

    def assert_no_mutation(self, calls):
        self.assertNotIn(" build ", calls)
        self.assertNotIn(" up ", calls)
        self.assertNotIn(" down ", calls)
        self.assertNotIn("--volumes", calls)

    def test_refreshes_only_core_and_ai_in_the_existing_govbiz_project(self):
        result, calls = self.run_script()

        self.assertEqual(0, result.returncode, result.stderr)
        self.assertIn("--project-name govbiz", calls)
        self.assertIn(" build core-api ai-service", calls)
        self.assertIn(" up --detach --no-deps --no-build ai-service", calls)
        self.assertIn(" up --detach --no-deps --no-build core-api", calls)
        self.assertNotIn(" down ", calls)
        self.assertNotIn("--volumes", calls)
        self.assertNotIn(" up --detach --no-deps --no-build mysql", calls)
        self.assertNotIn(" up --detach --no-deps --no-build qdrant", calls)
        self.assertIn("Existing MySQL and Qdrant containers and volumes were not recreated or removed", result.stdout)

    def test_missing_target_project_stops_before_build_or_replacement(self):
        result, calls = self.run_script(REFRESH_PROJECT_CONTAINERS="")

        self.assertNotEqual(0, result.returncode)
        self.assertIn("is not present", result.stderr)
        self.assert_no_mutation(calls)

    def test_unexpected_compose_configuration_stops_before_inspecting_or_mutating(self):
        result, calls = self.run_script(REFRESH_CONFIGURED_SERVICES="mysql qdrant core-api web")

        self.assertNotEqual(0, result.returncode)
        self.assertIn("does not contain expected service 'ai-service'", result.stderr)
        self.assert_no_mutation(calls)

    def test_stopped_data_or_web_service_stops_before_build_or_replacement(self):
        result, calls = self.run_script(REFRESH_RUNNING_SERVICES="mysql web ai-service core-api")

        self.assertNotEqual(0, result.returncode)
        self.assertIn("Required existing service 'qdrant' is not running", result.stderr)
        self.assert_no_mutation(calls)


if __name__ == "__main__":
    unittest.main()
