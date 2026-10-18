import { ReactNode } from "react";

interface PageTransitionProps {
    children: ReactNode;
    className?: string;
    skipTransition?: boolean;
}

export const PageTransition = ({ children, className = "" }: PageTransitionProps) => {
    return <div className={`w-full h-full ${className}`}>{children}</div>;
};

