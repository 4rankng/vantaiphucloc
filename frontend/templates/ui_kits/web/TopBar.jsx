/* eslint-disable */
// TopBar — sticky, translucent header with breadcrumb, search, notifications, user.

function TopBar({ title, crumb, role = 'Kế toán' }) {
  return (
    <header className="topbar">
      <div className="topbar-left">
        <h2 className="topbar-title">{title}</h2>
        {crumb ? (
          <span className="topbar-crumb">
            <Icon.ChevronRight />
            {crumb}
          </span>
        ) : null}
      </div>

      <div className="topbar-actions">
        <div className="topbar-search">
          <Icon.Search />
          <input type="text" placeholder="Tìm khách hàng, lệnh, container…" />
          <span className="kbd">⌘K</span>
        </div>

        <div className="topbar-divider"></div>

        <button className="icon-btn" aria-label="Thông báo">
          <Icon.Bell />
          <span className="notif-dot"></span>
        </button>

        <button className="user-btn">
          <span className="user-avatar"><Icon.User /></span>
          <span className="role">{role}</span>
          <span className="chev"><Icon.ChevronDown /></span>
        </button>
      </div>
    </header>
  );
}

Object.assign(window, { TopBar });
