export default function Sidebar({ role }) {
  const items = ['Dashboard', 'Delegation', 'Checklist', 'Work Request', 'Approvals', 'MIS', 'Reports'];

  return (
    <aside className="left-nav">
      <h2>TaskDone</h2>
      <p className="left-role">{role}</p>
      <ul>
        {items.map((item) => (
          <li key={item}>{item}</li>
        ))}
      </ul>
    </aside>
  );
}
