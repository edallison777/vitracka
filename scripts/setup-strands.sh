#!/bin/bash

# Strands Integration Setup Script
# Sets up the Python agent service for Vitracka

set -e

echo "=========================================="
echo "Vitracka Strands Integration Setup"
echo "=========================================="
echo ""

# Check Python version
echo "Checking Python version..."
if ! command -v python3 &> /dev/null; then
    echo "❌ Python 3 is not installed"
    echo "Please install Python 3.11 or higher"
    exit 1
fi

PYTHON_VERSION=$(python3 --version | cut -d' ' -f2 | cut -d'.' -f1,2)
echo "✓ Found Python $PYTHON_VERSION"

# Check pip
echo "Checking pip..."
if ! command -v pip3 &> /dev/null; then
    echo "❌ pip is not installed"
    exit 1
fi
echo "✓ pip is available"

# Install Python dependencies
echo ""
echo "Installing Python dependencies..."
cd agents/coach-companion
pip3 install -r requirements.txt
echo "✓ Python dependencies installed"

# Check for AWS credentials
echo ""
echo "Checking AWS credentials..."
if [ -z "$AWS_BEDROCK_API_KEY" ] && [ -z "$AWS_ACCESS_KEY_ID" ]; then
    echo "⚠️  AWS credentials not found"
    echo ""
    echo "You need to set up AWS Bedrock access:"
    echo ""
    echo "Option 1: API Key (Quick Start)"
    echo "  export AWS_BEDROCK_API_KEY=your-key"
    echo "  export AWS_REGION=us-east-1"
    echo ""
    echo "Option 2: IAM Credentials"
    echo "  aws configure"
    echo ""
    echo "See STRANDS_INTEGRATION_GUIDE.md for detailed instructions"
    echo ""
    read -p "Do you want to continue anyway? (y/n) " -n 1 -r
    echo
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        exit 1
    fi
else
    echo "✓ AWS credentials found"
fi

# Test the agent
echo ""
echo "Testing the agent..."
if python3 test_agent.py; then
    echo "✓ Agent test passed!"
else
    echo "⚠️  Agent test failed"
    echo "This might be due to missing AWS credentials or Bedrock access"
    echo "See STRANDS_INTEGRATION_GUIDE.md for troubleshooting"
fi

# Install Node.js dependencies
echo ""
echo "Installing Node.js dependencies..."
cd ../..
npm install
echo "✓ Node.js dependencies installed"

echo ""
echo "=========================================="
echo "Setup Complete!"
echo "=========================================="
echo ""
echo "Next steps:"
echo "1. Configure AWS credentials (if not done)"
echo "2. Start the agent service: cd agents/coach-companion && python api.py"
echo "3. Start the Node.js backend: npm run dev"
echo "4. Or use Docker Compose: docker-compose up"
echo ""
echo "See STRANDS_INTEGRATION_GUIDE.md for detailed instructions"
