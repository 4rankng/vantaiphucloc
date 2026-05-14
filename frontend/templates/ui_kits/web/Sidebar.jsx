/* eslint-disable */
// Sidebar — left navigation, deep emerald surface.
// Items are passed in via props so the dashboard / accountant / driver shells
// can wire up different menus from the same component.

function Sidebar({ items, activeKey, onNavigate, role = 'Kế toán', initial = 'K', onLogout }) {
  return (
    <aside className="sidebar">
      <div className="sidebar-brand">
        <div className="sidebar-brand-logo">
          <img src="../../assets/logo-512.png" alt="TTransport" />
        </div>
        <div className="sidebar-brand-meta">
          <strong>TTransport</strong>
          <span>Phúc Lộc</span>
        </div>
      </div>

      <nav className="sidebar-nav">
        <div className="sidebar-section-label">Điều hành</div>
        {items.filter(i => i.section !== 'admin').map(item => {
          const IconC = item.icon;
          const isActive = item.key === activeKey;
          return (
            <button
              key={item.key}
              className={`sidebar-item ${isActive ? 'active' : ''}`}
              onClick={() => onNavigate(item.key)}
            >
              <IconC />
              <span className="sidebar-item-label">{item.label}</span>
              {isActive ? <Icon.ChevronRight size={12} /> : null}
              {!isActive && item.count != null ? (
                <span className="sidebar-item-trail">{item.count}</span>
              ) : null}
            </button>
          );
        })}

        {items.some(i => i.section === 'admin') ? (
          <>
            <div className="sidebar-section-label" style={{ paddingTop: 22 }}>Thiết lập</div>
            {items.filter(i => i.section === 'admin').map(item => {
              const IconC = item.icon;
              const isActive = item.key === activeKey;
              return (
                <button
                  key={item.key}
                  className={`sidebar-item ${isActive ? 'active' : ''}`}
                  onClick={() => onNavigate(item.key)}
                >
                  <IconC />
                  <span className="sidebar-item-label">{item.label}</span>
                  {isActive ? <Icon.ChevronRight size={12} /> : null}
                </button>
              );
            })}
          </>
        ) : null}
      </nav>

      <div class="sidebar-footer">
        <button className="sidebar-user">
          <div className="avatar"><Icon.User /></div>
          <div className="meta">
            <div className="name">{role}</div>
            <div className="role">phucloc.tingting.vip</div>
          </div>
          <Icon.LogOut size={14} />
        </button>
      </div>
    </aside>
  );
}

Object.assign(window, { Sidebar });
