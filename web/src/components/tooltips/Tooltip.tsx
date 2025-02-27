/*
 * Copyright (c) 2021 - 2023, Ludvig Lundgren and the autobrr contributors.
 * SPDX-License-Identifier: GPL-2.0-or-later
 */

import React, { useState, useCallback, useEffect } from 'react';
import type { ReactNode } from 'react';

import { Transition } from "@headlessui/react";
import { usePopperTooltip } from "react-popper-tooltip";
import { Placement } from '@popperjs/core';

import { classNames } from "@utils";

interface TooltipProps {
  label: ReactNode;
  onLabelClick?: (e: React.MouseEvent<HTMLDivElement>) => void;
  title?: ReactNode;
  maxWidth?: string;
  requiresClick?: boolean;
  children: ReactNode;
}

// NOTE(stacksmash76): onClick is not propagated
// to the label (always-visible) component, so you will have
// to use the `onLabelClick` prop in this case.

export const Tooltip = ({
  label,
  onLabelClick,
  title,
  children,
  requiresClick,
  maxWidth = "max-w-sm"
}: TooltipProps) => {
  const [isTooltipVisible, setIsTooltipVisible] = useState(false);
  const [tooltipNode, setTooltipNode] = useState<HTMLDivElement | null>(null);
  const [triggerNode, setTriggerNode] = useState<HTMLDivElement | null>(null);
  const isTouchDevice = () => {
    return 'ontouchstart' in window || navigator.maxTouchPoints > 0;
  };

  // default tooltip placement to right
  const [placement, setPlacement] = useState<Placement>('right');

  // check screen size and update placement if needed
  useEffect(() => {
    const updatePlacementForScreenSize = () => {
      const screenWidth = window.innerWidth;
      if (screenWidth < 640) { // tailwind's sm breakpoint
        setPlacement('top');
      } else {
        setPlacement('right');
      }
    };

    updatePlacementForScreenSize();
    window.addEventListener('resize', updatePlacementForScreenSize);

    return () => {
      window.removeEventListener('resize', updatePlacementForScreenSize);
    };
  }, []);


  const {
    getTooltipProps,
    setTooltipRef: popperSetTooltipRef,
    setTriggerRef: popperSetTriggerRef,
    visible
  } = usePopperTooltip({
    trigger: isTouchDevice() ? [] : (requiresClick ? 'click' : ['click', 'hover']),
    interactive: true,
    delayHide: 200,
    placement,
  });

  const handleTouch = (e: React.TouchEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsTooltipVisible(!isTooltipVisible);
  };

  const setTooltipRef = (node: HTMLDivElement | null) => {
    popperSetTooltipRef(node);
    setTooltipNode(node);
  };

  const setTriggerRef = (node: HTMLDivElement | null) => {
    popperSetTriggerRef(node);
    setTriggerNode(node);
  };

  const handleClickOutside = useCallback((event: TouchEvent) => {
    if (tooltipNode && !tooltipNode.contains(event.target as Node) && triggerNode && !triggerNode.contains(event.target as Node)) {
      setIsTooltipVisible(false);
    }
  }, [tooltipNode, triggerNode]);

  useEffect(() => {
    document.addEventListener('touchstart', handleClickOutside, true);
    return () => {
      document.removeEventListener('touchstart', handleClickOutside, true);
    };
  }, [handleClickOutside, tooltipNode, triggerNode]);

  return (
    <>
      <div
        ref={setTriggerRef}
        className="truncate"
        onClick={(e) => {
          if (!isTouchDevice() && !visible) {
            onLabelClick?.(e);
          }
        }}
        onTouchStart={isTouchDevice() ? handleTouch : undefined}
      >
        {label}
      </div>
      <Transition
        show={isTouchDevice() ? isTooltipVisible : visible}
        className="z-10"
        enter="transition duration-200 ease-out"
        enterFrom="opacity-0"
        enterTo="opacity-100"
        leave="transition duration-200 ease-in"
        leaveFrom="opacity-100"
        leaveTo="opacity-0"
      >
        <div
          ref={setTooltipRef}
          {...getTooltipProps({
            className: classNames(
              maxWidth,
              "rounded-md border border-gray-300 text-black text-xs normal-case tracking-normal font-normal shadow-lg dark:text-white dark:border-gray-700 dark:shadow-2xl"
            ),
            onClick: (e: React.MouseEvent) => e.stopPropagation()
          })}
        >
          {title ? (
            <div className="flex justify-between items-center p-2 border-b border-gray-300 bg-gray-100 dark:border-gray-700 dark:bg-gray-800 rounded-t-md">
              {title}
            </div>
          ) : null}
          <div
            className={classNames(
              title ? "" : "rounded-t-md",
              "whitespace-normal break-words py-1 px-2 rounded-b-md bg-white dark:bg-gray-900"
            )}
          >
            {children}
          </div>
        </div>
      </Transition>
    </>
  );
};
