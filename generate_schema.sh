#!/bin/bash

# Ensure the script exits if any command fails
set -e

# Check if agno is installed and on the latest version
check_agno_version() {
    echo "Checking Agno version..."

    # Get installed version
    INSTALLED_VERSION=$(pip show agno 2>/dev/null | grep "^Version:" | cut -d' ' -f2)

    if [[ -z "$INSTALLED_VERSION" ]]; then
        echo "Error: Agno is not installed. Install it with: pip install agno"
        exit 1
    fi

    # Get latest release from GitHub API
    LATEST_VERSION=$(curl -s https://api.github.com/repos/agno-agi/agno/releases/latest | grep '"tag_name":' | sed -E 's/.*"v?([^"]+)".*/\1/')

    if [[ -z "$LATEST_VERSION" ]]; then
        echo "Warning: Could not fetch latest version from GitHub. Proceeding with installed version."
        return 0
    fi

    echo "Installed: $INSTALLED_VERSION"
    echo "Latest:    $LATEST_VERSION"

    if [[ "$INSTALLED_VERSION" != "$LATEST_VERSION" ]]; then
        echo ""
        echo "Error: Version mismatch. Please update agno to the latest version:"
        echo "  pip install --upgrade agno"
        exit 1
    fi

    echo "Running on latest version."
    echo ""
}

check_agno_version

OUTPUT_FILE="agentos.yaml"
TEMP_PYTHON_SCRIPT="generate_schema_temp.py"

echo "Creating Python generation script..."

# Create the python script dynamically
# We implicitly add 'import yaml' to fix the missing dependency
cat <<EOF > "$TEMP_PYTHON_SCRIPT"
import yaml
from agno.os import AgentOS
from agno.agent import Agent
from agno.db.sqlite import SqliteDb
from agno.models.anthropic import Claude

# Initialize Agent
agent = Agent(
    name="Agno Agent",
    model=Claude(id="claude-sonnet-4-5"),
    db=SqliteDb(db_file="agno.db"),
    add_history_to_context=True,
    markdown=True,
)

# Initialize AgentOS App
agent_os = AgentOS(agents=[agent])
app = agent_os.get_app()

# Generate and save Schema
schema = app.openapi()
with open("$OUTPUT_FILE", "w", encoding="utf-8") as f:
    yaml.dump(schema, f)
    print(f"Successfully wrote OpenAPI schema to $OUTPUT_FILE")
EOF

echo "Running Python script..."
python3 "$TEMP_PYTHON_SCRIPT"

echo "Cleaning up..."
rm "$TEMP_PYTHON_SCRIPT"

echo "Done! Schema is ready at ./$OUTPUT_FILE"