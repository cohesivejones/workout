import { User } from "../types";
import "./UserList.css";
import { useUserContext } from "../contexts/useUserContext";

interface UserListProps {
  users: User[];
}

function UserList({ users }: UserListProps) {
  const { login } = useUserContext();

  if (users.length === 0) {
    return <div className="no-users">No users found</div>;
  }

  return (
    <div className="user-list">
      <h2>Login</h2>
      <div className="user-buttons">
        {users.map((user) => (
          <button
            key={user.id}
            className="user-button"
            onClick={() => login(user)}
          >
            {user.name}
          </button>
        ))}
      </div>
    </div>
  );
}

export default UserList;
