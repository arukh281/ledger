'use client';

export interface SegmentedOption<T extends string> {
  value: T;
  label: string;
}

interface SegmentedChoiceProps<T extends string> {
  options: SegmentedOption<T>[];
  value: T;
  onChange: (value: T) => void;
  name: string;
  className?: string;
  /** Tighter pills that size to label (e.g. Primary / Secondary book switch). */
  compact?: boolean;
  /** Stretch segments on small screens (e.g. period filter). */
  fill?: boolean;
}

/** Horizontal pill toggle with readable labels. */
export function SegmentedChoice<T extends string>({
  options,
  value,
  onChange,
  name,
  className = '',
  compact = false,
  fill = false,
}: SegmentedChoiceProps<T>) {
  return (
    <div
      role="radiogroup"
      aria-label={name}
      className={[
        'segmented',
        compact ? 'segmented--compact w-fit self-start' : '',
        fill ? 'segmented--fill' : '',
        className,
      ]
        .filter(Boolean)
        .join(' ')}
    >
      {options.map(opt => {
        const selected = value === opt.value;
        return (
          <button
            key={opt.value}
            type="button"
            role="radio"
            aria-checked={selected}
            onClick={() => onChange(opt.value)}
            className={[
              'segmented-btn',
              selected ? 'segmented-btn--active' : '',
            ]
              .filter(Boolean)
              .join(' ')}
          >
            {opt.label}
          </button>
        );
      })}
    </div>
  );
}
