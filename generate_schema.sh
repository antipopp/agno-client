#!/bin/bash

# Ensure the script exits if any command fails
set -e

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