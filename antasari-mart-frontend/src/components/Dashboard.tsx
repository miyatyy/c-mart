export default function Dashboard({ user, onLogout }: { user: any, onLogout: () => void }) {
  return (
    <div className="dashboard">
      <h1>Selamat Datang, {user.nama}</h1>
      <p>Role Anda: <strong>{user.role}</strong></p>
      
      {/* Contoh Tampilan Berdasarkan Role */}
      {user.role === 'admin_pro' && <div className="pro-badge">Fitur PRO Aktif</div>}
      
      <button onClick={onLogout}>Logout</button>
    </div>
  );
}