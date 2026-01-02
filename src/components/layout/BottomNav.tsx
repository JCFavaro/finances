import { NavLink } from 'react-router-dom';

const navItems = [
  { path: '/', label: 'Inicio', icon: HomeIcon },
  { path: '/add', label: 'Nuevo', icon: PlusIcon, primary: true },
  { path: '/history', label: 'Historial', icon: ClockIcon },
];

function HomeIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" d="m2.25 12 8.954-8.955c.44-.439 1.152-.439 1.591 0L21.75 12M4.5 9.75v10.125c0 .621.504 1.125 1.125 1.125H9.75v-4.875c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125V21h4.125c.621 0 1.125-.504 1.125-1.125V9.75M8.25 21h8.25" />
    </svg>
  );
}

function PlusIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
    </svg>
  );
}

function ClockIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" />
    </svg>
  );
}

export function BottomNav() {
  return (
    <nav className="fixed bottom-0 left-0 right-0 bg-white border-t border-slate-100 safe-bottom">
      <div className="flex justify-around items-center h-20 max-w-lg mx-auto px-2">
        {navItems.map((item) => (
          <NavLink
            key={item.path}
            to={item.path}
            className={({ isActive }) =>
              `flex flex-col items-center justify-center transition-all duration-200 ${
                item.primary
                  ? 'relative -mt-6'
                  : `w-16 h-full ${isActive ? 'text-blue-600' : 'text-slate-400'}`
              }`
            }
          >
            {({ isActive }) =>
              item.primary ? (
                <div className="flex flex-col items-center">
                  <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-blue-500 to-blue-600 flex items-center justify-center shadow-lg shadow-blue-500/30 active:scale-95 transition-transform">
                    <item.icon className="w-7 h-7 text-white" />
                  </div>
                  <span className="text-[11px] font-medium mt-1.5 text-slate-500">{item.label}</span>
                </div>
              ) : (
                <>
                  <item.icon className={`w-6 h-6 transition-colors ${isActive ? 'text-blue-600' : ''}`} />
                  <span className={`text-[11px] font-medium mt-1 transition-colors ${isActive ? 'text-blue-600' : ''}`}>
                    {item.label}
                  </span>
                </>
              )
            }
          </NavLink>
        ))}
      </div>
    </nav>
  );
}
