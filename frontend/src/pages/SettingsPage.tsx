import { useTheme } from '../hooks/useTheme';

export default function SettingsPage() {
  const { theme, toggleTheme } = useTheme();

  return (
    <main className="page">
      <header>
        <div>
          <h1>Ajustes</h1>
          <p>Preferencias de la aplicacion.</p>
        </div>
      </header>

      <div className="settings-section">
        <p className="settings-section__title">Apariencia</p>
        <div className="settings-item">
          <div>
            <p className="settings-item__label">Modo oscuro</p>
            <p className="settings-item__hint">
              {theme === 'dark' ? 'Activo' : 'Inactivo'}
            </p>
          </div>
          <button
            className={`toggle-switch${theme === 'dark' ? ' toggle-switch--on' : ''}`}
            type="button"
            role="switch"
            aria-checked={theme === 'dark'}
            aria-label="Modo oscuro"
            onClick={toggleTheme}
          >
            <span className="toggle-switch__thumb" />
          </button>
        </div>
      </div>
    </main>
  );
}
