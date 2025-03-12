import { useState, useEffect } from "react";
import UserList from "../components/UserList";
import { fetchUsers } from "../api";
import { User } from "../types";
import "./LoginPage.css";

function LoginPage() {
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const loadUsers = async () => {
      try {
        const usersData = await fetchUsers();
        setUsers(usersData);
        setLoading(false);
      } catch (err) {
        console.error("Failed to load users:", err);
        setError("Failed to load users. Please try again later.");
        setLoading(false);
      }
    };
    loadUsers();
  }, []);

  if (loading) {
    return <div className="loading">Loading...</div>;
  }

  return (
    <div>
      {error && <div className="error-message">{error}</div>}

      <UserList users={users} />
    </div>
  );
}

export default LoginPage;
