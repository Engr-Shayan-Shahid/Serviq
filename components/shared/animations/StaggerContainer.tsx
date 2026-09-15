"use client";

import { Children, type ReactNode } from "react";
import { motion, useReducedMotion } from "framer-motion";
import { cn } from "@/lib/utils";

type StaggerContainerProps = {
  children: ReactNode;
  className?: string;
  stagger?: number;
};

export function StaggerContainer({
  children,
  className,
  stagger = 0.08,
}: StaggerContainerProps) {
  const reduceMotion = useReducedMotion();
  const staggerChildren = reduceMotion ? 0 : stagger;

  return (
    <motion.div
      className={cn(className)}
      variants={{
        container: {
          transition: { staggerChildren },
        },
        hidden: {},
        show: {
          transition: { staggerChildren },
        },
      }}
      initial="hidden"
      animate="show"
    >
      {Children.map(children, (child) => (
        <motion.div
          variants={{
            hidden: { opacity: 0, y: reduceMotion ? 0 : 16 },
            show: {
              opacity: 1,
              y: 0,
              transition: {
                duration: reduceMotion ? 0 : 0.3,
                ease: "easeOut",
              },
            },
          }}
        >
          {child}
        </motion.div>
      ))}
    </motion.div>
  );
}
