#!/usr/bin/env python3
"""
MCP Server Status Checker
Checks the status of all MCP servers using simple HTTP requests
"""

import http.client
import socket
import json
from concurrent.futures import ThreadPoolExecutor
from typing import Dict, List, Any, Optional

# MCP Server configurations
MCP_SERVERS = [
    {"name": "Memory", "port": 13000},
    {"name": "Filesystem", "port": 13001},
    {"name": "Terminal", "port": 13002},
    {"name": "Kubectl", "port": 13003},
    {"name": "Helm", "port": 13004},
    {"name": "Minikube", "port": 13005}
]


def check_server(server: Dict[str, Any]) -> Dict[str, Any]:
    """Check the status of a single MCP server"""
    host = 'localhost'
    port = server['port']

    try:
        conn = http.client.HTTPConnection(host, port, timeout=2)
        conn.request('GET', '/health')
        response = conn.getresponse()

        if response.status == 200:
            try:
                data = json.loads(response.read().decode('utf-8'))
                return {
                    'name': server['name'],
                    'status': 'running',
                    'status_code': response.status,
                    'response': data
                }
            except (json.JSONDecodeError, UnicodeDecodeError):
                return {
                    'name': server['name'],
                    'status': 'error',
                    'error': 'Invalid JSON response'
                }
        else:
            return {
                'name': server['name'],
                'status': 'error',
                'error': f'HTTP {response.status} {response.reason}'
            }

    except ConnectionRefusedError:
        return {
            'name': server['name'],
            'status': 'down',
            'error': 'Connection refused'
        }
    except socket.timeout:
        return {
            'name': server['name'],
            'status': 'timeout',
            'error': 'Request timed out'
        }
    except Exception as e:
        return {
            'name': server['name'],
            'status': 'error',
            'error': str(e)
        }
    finally:
        if 'conn' in locals():
            conn.close()


def print_results(results: List[Dict[str, Any]]) -> None:
    """Print the results of the server checks"""
    print("\n🔍 MCP Server Status")
    print("=" * 50)

    for result in results:
        status = result['status']

        if status == 'running':
            status_icon = '✅'
            details = f"(HTTP {result.get('status_code', '?')})"
        else:
            status_icon = '❌'
            details = f"- {result.get('error', 'Unknown error')}"

        print(f"{status_icon} {result['name'].ljust(10)}: {status.upper()} {details}")

    # Print summary
    print("\n" + "=" * 50)
    running = sum(1 for r in results if r['status'] == 'running')
    total = len(results)

    if running == total:
        print(f"✅ All {running} MCP servers are running!")
    else:
        print(f"⚠️  {running} of {total} MCP servers are running")

    print("\n💡 Next Steps:")
    if running < total:
        print("1. Start the MCP servers with: npm run mcp:start")
        print("2. For development with auto-reload: npm run mcp:dev")
    print("3. Run integration tests: npm test")
    print("4. Start development server: npm run dev")


def main():
    print("🔍 Checking MCP servers...")

    # Check all servers in parallel
    with ThreadPoolExecutor(max_workers=len(MCP_SERVERS)) as executor:
        results = list(executor.map(check_server, MCP_SERVERS))

    # Print results
    print_results(results)


if __name__ == "__main__":
    main()
