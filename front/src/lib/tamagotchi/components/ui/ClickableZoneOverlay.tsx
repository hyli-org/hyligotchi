import React, { useState, useEffect, useLayoutEffect, type CSSProperties } from 'react';

interface ClickableZoneOverlayProps {
  imgRef: React.RefObject<HTMLImageElement | null>;
  naturalZoneX: number;
  naturalZoneY: number;
  naturalZoneWidth: number;
  naturalZoneHeight: number;
  onClick: () => void;
  backgroundColor?: string;
  // Optional: to pass custom styles to the overlay itself
  style?: CSSProperties;
  // Optional: to pass a custom class name
  className?: string;
}

const ClickableZoneOverlay: React.FC<ClickableZoneOverlayProps> = ({
  imgRef,
  naturalZoneX,
  naturalZoneY,
  naturalZoneWidth,
  naturalZoneHeight,
  onClick,
  backgroundColor = 'rgba(255, 0, 0, 0.5)', // Default to red, semi-transparent
  style: customStyle,
  className
}) => {
  const [zoneStyle, setZoneStyle] = useState<CSSProperties>({});

  const calculateAndSetZonePosition = () => {
    const imageElement = imgRef.current;
    
    if (!imageElement || imageElement.naturalWidth === 0 || imageElement.naturalHeight === 0) {
      setZoneStyle({ display: 'none' });
      return;
    }

    const naturalWidth = imageElement.naturalWidth;
    const naturalHeight = imageElement.naturalHeight;
    const displayedImgWidth = imageElement.offsetWidth;
    const displayedImgHeight = imageElement.offsetHeight;

    const scale = Math.min(
      displayedImgWidth / naturalWidth,
      displayedImgHeight / naturalHeight
    );

    const actualContentWidth = naturalWidth * scale;
    const actualContentHeight = naturalHeight * scale;

    const offsetX = (displayedImgWidth - actualContentWidth) / 2;
    const offsetY = (displayedImgHeight - actualContentHeight) / 2;

    const displayedZoneX = offsetX + (naturalZoneX * scale);
    const displayedZoneY = offsetY + (naturalZoneY * scale);
    const displayedZoneWidth = naturalZoneWidth * scale;
    const displayedZoneHeight = naturalZoneHeight * scale;

    setZoneStyle({
      position: 'absolute',
      left: `${imageElement.offsetLeft + displayedZoneX}px`,
      top: `${imageElement.offsetTop + displayedZoneY}px`,
      width: `${displayedZoneWidth}px`,
      height: `${displayedZoneHeight}px`,
      backgroundColor, // Use the passed or default background color
      cursor: 'pointer',
      boxSizing: 'border-box',
      display: 'block',
      opacity: 0,
      zIndex: 3, // Ensure it's on top of the image and screen overlay
      ...customStyle, // Allow overriding or extending styles
    });
  };

  useLayoutEffect(() => {
    const timer = setTimeout(() => {
      calculateAndSetZonePosition();
    }, 50); // Initial delay to allow image to render
    
    return () => clearTimeout(timer);
  }, []);

  useEffect(() => {
    const imageElement = imgRef.current;
    let resizeObserver: ResizeObserver | null = null;

    if (imageElement) {
      const handleImageLoadOrResize = () => {
        calculateAndSetZonePosition();
        setTimeout(calculateAndSetZonePosition, 50);
        setTimeout(calculateAndSetZonePosition, 200);
      };

      if (imageElement.complete && imageElement.naturalWidth > 0) {
        handleImageLoadOrResize();
      } else {
        imageElement.onload = handleImageLoadOrResize;
      }
      
      resizeObserver = new ResizeObserver(handleImageLoadOrResize);
      resizeObserver.observe(imageElement);
    } else {
      setZoneStyle({ display: 'none', ...customStyle });
    }

    window.addEventListener('resize', calculateAndSetZonePosition);

    return () => {
      window.removeEventListener('resize', calculateAndSetZonePosition);
      if (imageElement) {
        imageElement.onload = null;
      }
      if (resizeObserver) {
        resizeObserver.disconnect();
      }
    };
  }, [imgRef, naturalZoneX, naturalZoneY, naturalZoneWidth, naturalZoneHeight, customStyle]);

  if (zoneStyle.display === 'none') {
    return null;
  }

  return (
    <div style={zoneStyle} className={className} onClick={onClick} />
  );
};

export default ClickableZoneOverlay; 