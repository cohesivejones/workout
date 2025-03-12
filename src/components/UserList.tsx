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
      <table>
        <thead>
          <tr>
            <th>Name</th>
          </tr>
        </thead>
        <tbody>
          {users.map((user) => (
            <tr key={user.id}>
              <td>
                <button onClick={() => login(user)}>{user.name}</button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export default UserList;
