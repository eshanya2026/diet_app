/**
 * Admin Settings placeholder.
 */

export default function AdminSettings() {
  return (
    <div>
      <h4 className="mb-4">Settings</h4>
      <div className="card border-0 shadow-sm">
        <div className="card-body">
          <p className="text-muted mb-0">Admin settings (e.g. JWT secret, session duration) can be configured via server environment variables. See server/.env.example.</p>
        </div>
      </div>
    </div>
  );
}
