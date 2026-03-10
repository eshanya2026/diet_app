/**
 * Consistent page header for professional layout: title, optional description, optional actions.
 */

export default function PageHeader({ title, description, children }) {
  return (
    <header className="page-header">
      <div className="page-header__inner">
        <div>
          <h1 className="page-header__title theme-text">{title}</h1>
          {description != null && description !== '' && (
            <p className="page-header__description text-muted mb-0">{description}</p>
          )}
        </div>
        {children != null && <div className="page-header__actions">{children}</div>}
      </div>
    </header>
  );
}
