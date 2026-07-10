import React, { forwardRef } from 'react';
import { motion, HTMLMotionProps } from 'framer-motion';
import { useAnimationTier } from '@/hooks/useAnimationTier';

interface AdaptiveMotionProps extends HTMLMotionProps<'div'> {
  disableOn?: ('minimal' | 'low' | 'medium')[];
  fallback?: React.ReactNode;
  forceAnimate?: boolean;
  staggerDelay?: number;
  maxStagger?: number;
}

export const AdaptiveMotion = forwardRef<HTMLDivElement, AdaptiveMotionProps>(
  (
    {
      disableOn = ['minimal', 'low'],
      fallback,
      forceAnimate = false,
      staggerDelay = 0,
      maxStagger = 100,
      animate,
      transition,
      style,
      children,
      ...props
    },
    ref
  ) => {
    const tier = useAnimationTier();
    const shouldAnimate = forceAnimate || tier.shouldAnimate;
    const isDisabled = disableOn.includes(tier.tier) && !forceAnimate;

    if (isDisabled && !shouldAnimate) {
      return <div ref={ref} style={style} {...props}>{fallback ?? children}</div>;
    }

    const maxStaggerAllowed = Math.min(maxStagger, tier.staggerLimit);
    const stagger = shouldAnimate ? Math.min(staggerDelay, maxStaggerAllowed) : 0;

    const shouldReduce = tier.shouldReduceAnimations && !forceAnimate;

    const gpuStyle = {
      ...style,
      willChange: shouldAnimate ? 'transform, opacity' : undefined,
      transform: style?.transform,
      backfaceVisibility: 'hidden' as const,
      perspective: 1000,
    };

    const animateProps = shouldAnimate ? animate : undefined;
    const transitionProps = shouldAnimate ? (transition ?? { duration: shouldReduce ? 0.15 : 0.3 }) : undefined;

    return (
      <motion.div
        ref={ref}
        style={gpuStyle}
        animate={animateProps}
        transition={transitionProps}
        initial={shouldAnimate ? { opacity: 0, y: 20 * stagger } : false}
        exit={shouldAnimate ? { opacity: 0, y: -10 * stagger } : false}
        {...props}
      >
        {children}
      </motion.div>
    );
  }
);

AdaptiveMotion.displayName = 'AdaptiveMotion';

interface AdaptiveMotionListProps {
  items: any[];
  renderItem: (item: any, index: number, isLowEnd: boolean) => React.ReactNode;
  staggerDelay?: number;
  maxStagger?: number;
  disableOn?: ('minimal' | 'low' | 'medium')[];
  fallback?: React.ReactNode;
}

export function AdaptiveMotionList({
  items,
  renderItem,
  staggerDelay = 30,
  maxStagger = 100,
  disableOn = ['minimal', 'low'],
  fallback,
}: AdaptiveMotionListProps) {
  const tier = useAnimationTier();
  const shouldAnimate = tier.shouldAnimate;
  const isDisabled = disableOn.includes(tier.tier);

  if (isDisabled || !shouldAnimate) {
    return (
      <div>
        {items.map((item, index) => renderItem(item, index, true))}
      </div>
    );
  }

  const maxStaggerAllowed = Math.min(maxStagger, tier.staggerLimit);
  const stagger = Math.min(staggerDelay, maxStaggerAllowed);

  return (
    <div>
      {items.map((item, index) => (
        <motion.div
          key={item.id ?? index}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: tier.shouldReduceAnimations ? 0.15 : 0.3, delay: index * stagger }}
          style={{ willChange: 'transform, opacity', backfaceVisibility: 'hidden', perspective: 1000 }}
        >
          {renderItem(item, index, false)}
        </motion.div>
      ))}
    </div>
  );
}

interface CSSOnlyTransitionProps {
  className?: string;
  hoverScale?: number;
  tapScale?: number;
  duration?: number;
  children: React.ReactNode;
}

export function CSSOnlyTransition({
  className = '',
  hoverScale = 1.02,
  tapScale = 0.98,
  duration = 100,
  children,
}: CSSOnlyTransitionProps) {
  return (
    <div
      className={`transition-transform duration-${duration} ease-out will-change-transform backface-visibility:hidden perspective-1000 ${className}`}
      style={{
        willChange: 'transform',
        backfaceVisibility: 'hidden',
        perspective: 1000,
        transform: undefined,
      }}
    >
      {React.Children.map(children, child => {
        if (!React.isValidElement(child)) return child;
        return React.cloneElement(child as React.ReactElement, {
          className: `${child.props.className || ''} hover:scale-[${hoverScale}] active:scale-[${tapScale}] transition-transform duration-${duration} ease-out`,
        });
      })}
    </div>
  );
}

export function useStaggerConfig(itemCount: number) {
  const tier = useAnimationTier();
  const stagger = tier.shouldReduceAnimations ? 20 : 30;
  const maxStagger = tier.staggerLimit;
  const totalDelay = Math.min(itemCount * stagger, maxStagger);
  return { stagger, maxStagger, totalDelay, shouldAnimate: tier.shouldAnimate };
}

export function useReducedMotion() {
  const tier = useAnimationTier();
  return tier.shouldReduceAnimations || !tier.shouldAnimate;
}