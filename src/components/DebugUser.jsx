import { useUser } from "../context/UserContext";

export default function DebugUser() {
  const { matricule, email, username, id } = useUser();
  
  return (
    <div style={{ padding: '20px', backgroundColor: '#f0f0f0' }}>
      <h2>Debugging Info</h2>
      <p><strong>Matricule:</strong> {matricule || 'N/A'}</p>
      <p><strong>Email:</strong> {email || 'N/A'}</p>
      <p><strong>Username:</strong> {username || 'N/A'}</p>
      <p><strong>ID:</strong> {id || 'N/A'}</p>
    </div>
  );
}
