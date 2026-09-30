import paramiko
import sys
import time

if hasattr(sys.stdout, 'reconfigure'):
    sys.stdout.reconfigure(encoding='utf-8', errors='replace')
if hasattr(sys.stderr, 'reconfigure'):
    sys.stderr.reconfigure(encoding='utf-8', errors='replace')

HOST = "192.168.20.10"
USER = "miyya"
PASS = "miya89"
REMOTE_DIR = "/home/miyya/my-vue-app"

def run_deploy():
    print(f"[*] Menghubungkan ke {USER}@{HOST}...")
    ssh = paramiko.SSHClient()
    ssh.set_missing_host_key_policy(paramiko.AutoAddPolicy())
    
    try:
        ssh.connect(HOST, username=USER, password=PASS, timeout=15)
        print("[+] Berhasil terhubung melalui SSH.")
        
        # Perintah deployment
        commands = [
            f"cd {REMOTE_DIR} && pwd",
            f"sed -i 's/CHOKIDAR _USEPOLLING/CHOKIDAR_USEPOLLING/g' {REMOTE_DIR}/docker-compose.yml",
            f"docker rm -f vue-frontend 2>/dev/null || true",
            f"cd {REMOTE_DIR} && docker compose down --remove-orphans || true",
            f"cd {REMOTE_DIR} && docker compose up -d --build",
            f"cd {REMOTE_DIR} && docker compose ps",
            f"curl -I http://localhost:5173 2>/dev/null || true"
        ]
        
        full_command = " && ".join(commands)
        print(f"[*] Menjalankan perintah:\n    {full_command}\n")
        
        stdin, stdout, stderr = ssh.exec_command(full_command, get_pty=True)
        
        # Stream output
        while True:
            line = stdout.readline()
            if not line:
                break
            print(line, end="")
            sys.stdout.flush()
            
        exit_code = stdout.channel.recv_exit_status()
        print(f"\n[+] Status kode keluar: {exit_code}")
        
        if exit_code == 0:
            print("[✓] Deployment berhasil diselesaikan!")
        else:
            print(f"[x] Deployment selesai dengan error (kode {exit_code}).")
            
        return exit_code
        
    except Exception as e:
        print(f"[!] Error: {e}", file=sys.stderr)
        return 1
    finally:
        ssh.close()

if __name__ == "__main__":
    sys.exit(run_deploy())
