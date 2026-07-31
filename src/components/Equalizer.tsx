import { useMemo } from 'react';

interface EqualizerProps {
    bars?: number;
    barWidth?: string;
    barColor?: string;
    heightClass?: string;
    gapClass?: string;
    className?: string;
    delayStep?: number;
    durationBase?: number;
    durationStep?: number;
    heightPercent: number[] | ((index: number) => number);
}

export function Equalizer({
    bars = 4,
    barWidth = 'w-1',
    barColor = 'bg-emerald-500',
    heightClass = 'h-4',
    gapClass = 'gap-0.5',
    className = '',
    delayStep = 0,
    durationBase = 0,
    durationStep = 0,
    heightPercent,
}: EqualizerProps) {
    const items = useMemo(
        () =>
            Array.from({ length: bars }, (_, i) => ({
                key: i,
                delay: i * delayStep,
                duration: durationBase + i * durationStep,
                height:
                    typeof heightPercent === 'function'
                        ? heightPercent(i)
                        : heightPercent[i],
            })),
        [bars, delayStep, durationBase, durationStep, heightPercent]
    );

    return (
        <div className={`flex items-end ${heightClass} ${gapClass} ${className}`}>
            {items.map((item) => (
                <div
                    key={item.key}
                    className={`${barWidth} ${barColor} rounded-full animate-bounce`}
                    style={{
                        animationDelay: `${item.delay}ms`,
                        animationDuration: `${item.duration}ms`,
                        height: `${item.height}%`,
                    }}
                />
            ))}
        </div>
    );
}
