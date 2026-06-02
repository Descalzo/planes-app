interface SaveMarkerIconProps {
  filled: boolean;
  size?: number;
}

export default function SaveMarkerIcon({ filled, size = 18 }: SaveMarkerIconProps) {
  return (
    <span
      aria-hidden="true"
      className={`save-marker-icon${filled ? ' save-marker-icon--saved' : ''}`}
      style={{ width: size, height: size }}
    />
  );
}
