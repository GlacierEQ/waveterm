#!/usr/bin/env node

/**
 * AWS SDK Configuration Fix
 * Resolves AWS SDK connection issues for Amazon Q and other AWS services
 */

const fs = require('fs');
const path = require('path');

class AWSSDKFixer {
    constructor() {
        this.configPaths = [
            path.join(require('os').homedir(), '.aws', 'config'),
            path.join(require('os').homedir(), '.aws', 'credentials')
        ];
    }

    async fixConnectionIssues() {
        console.log('🔧 Fixing AWS SDK connection issues...\n');

        // Check Node.js version compatibility
        await this.checkNodeVersion();

        // Fix AWS configuration
        await this.fixAWSConfig();

        // Update package.json with correct AWS SDK
        await this.updateDependencies();

        // Create connection test
        await this.createConnectionTest();

        console.log('✅ AWS SDK configuration fixed!');
        console.log('\nNext steps:');
        console.log('1. Run: npm install');
        console.log('2. Configure your AWS credentials in ~/.aws/credentials');
        console.log('3. Test with: node aws-connection-test.js');
    }

    async checkNodeVersion() {
        const nodeVersion = process.version;
        console.log(`📦 Node.js version: ${nodeVersion}`);

        if (nodeVersion.startsWith('v24')) {
            console.log('⚠️ Node.js v24 may have compatibility issues with AWS SDK');
            console.log('Consider using Node.js v20 LTS for better AWS SDK compatibility');
        }
    }

    async fixAWSConfig() {
        const awsDir = path.join(require('os').homedir(), '.aws');

        // Create AWS directory if it doesn't exist
        if (!fs.existsSync(awsDir)) {
            fs.mkdirSync(awsDir, { recursive: true });
            console.log('📁 Created ~/.aws directory');
        }

        // Create default config
        const configPath = path.join(awsDir, 'config');
        if (!fs.existsSync(configPath)) {
            const defaultConfig = `[default]
region = us-east-1
output = json

[profile personal]
region = us-east-1
output = json
`;
            fs.writeFileSync(configPath, defaultConfig);
            console.log('📝 Created AWS config file');
        }

        // Create credentials template
        const credentialsPath = path.join(awsDir, 'credentials');
        if (!fs.existsSync(credentialsPath)) {
            const credentialsTemplate = `[default]
aws_access_key_id = YOUR_ACCESS_KEY
aws_secret_access_key = YOUR_SECRET_KEY

[personal]
aws_access_key_id = YOUR_PERSONAL_ACCESS_KEY
aws_secret_access_key = YOUR_PERSONAL_SECRET_KEY
`;
            fs.writeFileSync(credentialsPath, credentialsTemplate);
            console.log('📝 Created AWS credentials template');
        }
    }

    async updateDependencies() {
        const packagePath = path.join(process.cwd(), 'package.json');

        if (fs.existsSync(packagePath)) {
            const packageJson = JSON.parse(fs.readFileSync(packagePath, 'utf8'));

            // Add AWS SDK v3 if not present
            if (!packageJson.dependencies) packageJson.dependencies = {};
            if (!packageJson.dependencies['@aws-sdk/client-sts']) {
                packageJson.dependencies['@aws-sdk/client-sts'] = '^3.490.0';
                console.log('📦 Added @aws-sdk/client-sts to dependencies');
            }

            if (!packageJson.dependencies['@aws-sdk/credential-providers']) {
                packageJson.dependencies['@aws-sdk/credential-providers'] = '^3.490.0';
                console.log('📦 Added @aws-sdk/credential-providers to dependencies');
            }

            fs.writeFileSync(packagePath, JSON.stringify(packageJson, null, 2));
        }
    }

    async createConnectionTest() {
        const testContent = `#!/usr/bin/env node

/**
 * AWS SDK Connection Test
 * Tests AWS SDK configuration and connectivity
 */

const { STSClient, GetCallerIdentityCommand } = require('@aws-sdk/client-sts');
const { fromIni } = require('@aws-sdk/credential-providers');

async function testConnection() {
    console.log('🔍 Testing AWS SDK connection...\n');

    try {
        // Create STS client with credential provider
        const stsClient = new STSClient({
            credentials: fromIni(),
            region: 'us-east-1'
        });

        // Test credentials
        const command = new GetCallerIdentityCommand({});
        const response = await stsClient.send(command);

        console.log('✅ AWS SDK connection successful!');
        console.log('📋 Identity information:');
        console.log(\`   Account: \${response.Account}\`);
        console.log(\`   User ID: \${response.UserId}\`);
        console.log(\`   ARN: \${response.Arn}\`);
        console.log(\`   Region: us-east-1\`);

    } catch (error) {
        console.error('❌ AWS SDK connection failed:');
        console.error(\`   Error: \${error.message}\`);
        console.error(\`   Code: \${error.name}\`);

        if (error.message.includes('credentials')) {
            console.log('\n💡 Fix: Update your AWS credentials in ~/.aws/credentials');
        } else if (error.message.includes('region')) {
            console.log('\n💡 Fix: Set your AWS region in ~/.aws/config');
        } else if (error.message.includes('network') || error.message.includes('ENOTFOUND')) {
            console.log('\n💡 Fix: Check your internet connection and AWS service availability');
        }
    }
}

testConnection();
`;

        fs.writeFileSync('aws-connection-test.js', testContent);
        console.log('🧪 Created AWS connection test script');
    }
}

// Run fix if called directly
if (require.main === module) {
    const fixer = new AWSSDKFixer();
    fixer.fixConnectionIssues();
}

module.exports = AWSSDKFixer;
