interface Props {
  src: string;
  alt: string;
  onClose: () => void;
}

export function Lightbox({ src, alt, onClose }: Props) {
  return (
    <div className="lightbox-overlay" role="dialog" aria-modal="true" onClick={onClose}>
      <button type="button" className="lightbox-close" onClick={onClose} aria-label="Close">
        ✕
      </button>
      <img
        className="lightbox-image"
        src={src}
        alt={alt}
        onClick={(e) => e.stopPropagation()}
      />
    </div>
  );
}
