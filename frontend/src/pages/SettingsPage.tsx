import { useNavigate, Link } from 'react-router-dom';
import { useTheme, ThemePreference } from '../hooks/useTheme';
import { useSettings } from '../hooks/useSettings';
import { setAuthToken } from '../services/api';

const THEME_OPTIONS: { value: ThemePreference; label: string; hint: string }[] = [
  { value: 'auto', label: 'Auto', hint: 'Sigue el sistema' },
  { value: 'light', label: 'Claro', hint: 'Siempre claro' },
  { value: 'dark', label: 'Oscuro', hint: 'Siempre oscuro' },
];

interface ToggleItemProps {
  label: string;
  hint?: string;
  on: boolean;
  onToggle: () => void;
}

function ToggleItem({ label, hint, on, onToggle }: ToggleItemProps) {
  return (
    <div className="settings-item">
      <div>
        <p className="settings-item__label">{label}</p>
        {hint && <p className="settings-item__hint">{hint}</p>}
      </div>
      <button
        className={`toggle-switch${on ? ' toggle-switch--on' : ''}`}
        type="button"
        role="switch"
        aria-checked={on}
        aria-label={label}
        onClick={onToggle}
      >
        <span className="toggle-switch__thumb" />
      </button>
    </div>
  );
}

export default function SettingsPage() {
  const { preference, setPreference } = useTheme();
  const { settings, updateSetting } = useSettings();
  const navigate = useNavigate();

  function handleLogout() {
    setAuthToken(null);
    navigate('/login', { replace: true });
  }

  const currentHint = THEME_OPTIONS.find((o) => o.value === preference)?.hint ?? '';

  return (
    <main className="page">
      <header>
        <div>
          <h1>Ajustes</h1>
          <p>Personaliza tu experiencia.</p>
        </div>
      </header>

      {/* ── Apariencia ─────────────────────────────────── */}
      <div className="settings-section">
        <p className="settings-section__title">Apariencia</p>
        <div className="settings-item">
          <div>
            <p className="settings-item__label">Tema</p>
            <p className="settings-item__hint">{currentHint}</p>
          </div>
          <div className="settings-segmented" role="group" aria-label="Elegir tema">
            {THEME_OPTIONS.map(({ value, label }) => (
              <button
                key={value}
                type="button"
                className={`settings-segmented__btn${preference === value ? ' settings-segmented__btn--active' : ''}`}
                onClick={() => setPreference(value)}
              >
                {label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* ── Notificaciones internas ───────────────────── */}
      <div className="settings-section">
        <p className="settings-section__title">Notificaciones internas</p>
        <ToggleItem
          label="Mensajes del chat"
          hint="Avisos de nuevos mensajes en actividades"
          on={settings.notifMensajes}
          onToggle={() => updateSetting('notifMensajes', !settings.notifMensajes)}
        />
        <ToggleItem
          label="Solicitudes y actividad"
          hint="Aprobaciones, rechazos y novedades"
          on={settings.notifSolicitudes}
          onToggle={() => updateSetting('notifSolicitudes', !settings.notifSolicitudes)}
        />
        <ToggleItem
          label="Consultas privadas"
          hint="Preguntas al organizador"
          on={settings.notifConsultasPrivadas}
          onToggle={() => updateSetting('notifConsultasPrivadas', !settings.notifConsultasPrivadas)}
        />
      </div>

      {/* ── Privacidad ─────────────────────────────────── */}
      <div className="settings-section">
        <p className="settings-section__title">Privacidad</p>
        <ToggleItem
          label="Mostrar edad"
          hint="Visible en tu perfil público"
          on={settings.mostrarEdad}
          onToggle={() => updateSetting('mostrarEdad', !settings.mostrarEdad)}
        />
        <ToggleItem
          label="Mostrar Instagram"
          hint="Visible en tu perfil público"
          on={settings.mostrarInstagram}
          onToggle={() => updateSetting('mostrarInstagram', !settings.mostrarInstagram)}
        />
        <ToggleItem
          label="Mostrar ciudad"
          hint="Visible en tu perfil público"
          on={settings.mostrarCiudad}
          onToggle={() => updateSetting('mostrarCiudad', !settings.mostrarCiudad)}
        />
      </div>

      {/* ── Cuenta ─────────────────────────────────────── */}
      <div className="settings-section">
        <p className="settings-section__title">Cuenta</p>
        <Link className="settings-item settings-item--link" to="/profile">
          <div>
            <p className="settings-item__label">Editar perfil</p>
            <p className="settings-item__hint">Foto, nombre, bio, intereses...</p>
          </div>
          <span className="settings-item__chevron">›</span>
        </Link>
        <Link className="settings-item settings-item--link" to="/settings/activity-history">
          <div>
            <p className="settings-item__label">Historial de actividades</p>
            <p className="settings-item__hint">Actividades ya realizadas</p>
          </div>
          <span className="settings-item__chevron">›</span>
        </Link>
        <button
          className="settings-item settings-item--link settings-item--danger"
          type="button"
          onClick={handleLogout}
        >
          <p className="settings-item__label">Cerrar sesión</p>
        </button>
      </div>
    </main>
  );
}
