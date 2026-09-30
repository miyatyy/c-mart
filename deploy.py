import os
import sys
import time
import paramiko

if hasattr(sys.stdout, 'reconfigure'):
    sys.stdout.reconfigure(encoding='utf-8', errors='replace')
if hasattr(sys.stderr, 'reconfigure'):
    sys.stderr.reconfigure(encoding='utf-8', errors='replace')

HOST = "192.168.20.10"
USER = "miyya"
PASS = "miya89"
OLD_DIR = "/home/miyya/my-vue-app"
TARGET_DIR = "/home/miyya/campusmart"
LOCAL_DIR = os.path.dirname(os.path.abspath(__file__))

IGNORE_DIRS = {
    'node_modules', '.git', 'dist', '.agents', '.firebase', 
    'build', '.dart_tool', 'ios', 'android', 'windows', 'linux', 'macos'
}
IGNORE_FILES = {
    'antasari_mart_debug.apk', 'antasari_mart_release.apk'
}

def sftp_sync_dir(sftp, local_path, remote_path):
    """Sinkronisasi direktori lokal ke remote server secara rekursif via SFTP"""
    try:
        sftp.mkdir(remote_path)
    except IOError:
        pass  # Folder sudah ada
        
    for item in os.listdir(local_path):
        if item in IGNORE_DIRS or item in IGNORE_FILES:
            continue
            
        local_item = os.path.join(local_path, item)
        remote_item = f"{remote_path}/{item}".replace("\\", "/")
        
        if os.path.isdir(local_item):
            sftp_sync_dir(sftp, local_item, remote_item)
        else:
            try:
                # Cek ukuran file lokal vs remote untuk efisiensi
                local_stat = os.stat(local_item)
                try:
                    remote_stat = sftp.stat(remote_item)
                    if remote_stat.st_size == local_stat.st_size and remote_stat.st_mtime >= local_stat.st_mtime:
                        continue  # File sudah sama
                except IOError:
                    pass
                print(f"  [SFTP] Uploading {item} -> {remote_item}")
                sftp.put(local_item, remote_item)
            except Exception as ex:
                print(f"  [!] Gagal upload {item}: {ex}")

def main():
    print(f"==================================================")
    print(f"🚀 CAMPUS MART DEPLOYMENT OTOMATIS: LAPTOP -> VPS")
    print(f"Target: {USER}@{HOST}:{TARGET_DIR}")
    print(f"==================================================")
    
    ssh = paramiko.SSHClient()
    ssh.set_missing_host_key_policy(paramiko.AutoAddPolicy())
    
    try:
        print(f"\n[*] 1. Menghubungkan ke {USER}@{HOST}...")
        ssh.connect(HOST, username=USER, password=PASS, timeout=15)
        print("[+] Terhubung melalui SSH.")
        
        # 1. Matikan container lama di ~/my-vue-app
        print(f"\n[*] 2. Mematikan container lama di {OLD_DIR}...")
        stdin, stdout, stderr = ssh.exec_command(f"if [ -d {OLD_DIR} ]; then cd {OLD_DIR} && docker compose down --remove-orphans; fi")
        stdout.channel.recv_exit_status()
        print("[+] Container lama berhasil dimatikan.")
        
        # 2. Buat folder target
        print(f"\n[*] 3. Memastikan folder {TARGET_DIR} ada...")
        stdin, stdout, stderr = ssh.exec_command(f"mkdir -p {TARGET_DIR}")
        stdout.channel.recv_exit_status()
        
        # 3. Sinkronisasi file via SFTP
        print(f"\n[*] 4. Sinkronisasi source code Campus Mart ke server...")
        sftp = ssh.open_sftp()
        sftp_sync_dir(sftp, LOCAL_DIR, TARGET_DIR)
        sftp.close()
        print("[+] Sinkronisasi source code selesai.")
        
        # 4. Berikan izin eksekusi deploy.sh dan build container
        print(f"\n[*] 5. Menjalankan docker compose up -d --build di {TARGET_DIR}...")
        cmd = f"cd {TARGET_DIR} && chmod +x deploy.sh && docker compose down --remove-orphans && docker compose up -d --build"
        stdin, stdout, stderr = ssh.exec_command(cmd, get_pty=True)
        
        while True:
            line = stdout.readline()
            if not line:
                break
            print(line, end="")
            sys.stdout.flush()
            
        exit_code = stdout.channel.recv_exit_status()
        print(f"\n[+] Status exit build: {exit_code}")
        
        # 5. Tampilkan status container
        print(f"\n[*] 6. Status Container (docker compose ps):")
        stdin, stdout, stderr = ssh.exec_command(f"cd {TARGET_DIR} && docker compose ps")
        print(stdout.read().decode('utf-8', errors='replace'))
        
        # 6. Cek akses HTTP web
        print(f"\n[*] 7. Memeriksa respon HTTP Frontend...")
        for port in [8088, 80]:
            stdin, stdout, stderr = ssh.exec_command(f"curl -s -o /dev/null -w '%{{http_code}}' http://localhost:{port} || true")
            code = stdout.read().decode().strip()
            print(f"   -> Port {port} HTTP Response: {code}")
            
        print("\n[✓] Seluruh alur deployment berhasil diselesaikan!")
        return 0
        
    except Exception as e:
        print(f"\n[!] Deployment error: {e}", file=sys.stderr)
        return 1
    finally:
        ssh.close()

if __name__ == "__main__":
    sys.exit(main())
