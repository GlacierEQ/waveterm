#!/usr/bin/env node

/**
 * AWS SDK Connection Test
 * Tests AWS SDK configuration and connectivity
 */

const { STSClient, GetCallerIdentityCommand } = require('@aws-sdk/client-sts');
const { fromIni } = require('@aws-sdk/credential-providers');

async function testConnection() {
    console.log('🔍 Testing AWS SDK connection...
');

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
        console.log(`   Account: ${response.Account}`);
        console.log(`   User ID: ${response.UserId}`);
        console.log(`   ARN: ${response.Arn}`);
        console.log(`   Region: us-east-1`);

    } catch (error) {
        console.error('❌ AWS SDK connection failed:');
        console.error(`   Error: ${error.message}`);
        console.error(`   Code: ${error.name}`);

        if (error.message.includes('credentials')) {
            console.log('
💡 Fix: Update your AWS credentials in ~/.aws/credentials');
        } else if (error.message.includes('region')) {
            console.log('
💡 Fix: Set your AWS region in ~/.aws/config');
        } else if (error.message.includes('network') || error.message.includes('ENOTFOUND')) {
            console.log('
💡 Fix: Check your internet connection and AWS service availability');
        }
    }
}

testConnection();
