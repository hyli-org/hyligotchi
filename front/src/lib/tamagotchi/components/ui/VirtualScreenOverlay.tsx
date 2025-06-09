import React, { useState, useRef, useEffect, useLayoutEffect, type CSSProperties, type PropsWithChildren } from 'react';

interface VirtualScreenOverlayProps extends PropsWithChildren {
  imgRef: React.RefObject<HTMLImageElement | null>;
  naturalScreenX: number;
  naturalScreenY: number;
  naturalScreenWidth: number;
  naturalScreenHeight: number;
  // Optional: to pass custom styles to the overlay itself
  style?: CSSProperties;
  // Optional: to pass a custom class name
  className?: string;
}

const VirtualScreenOverlay: React.FC<VirtualScreenOverlayProps> = ({
  imgRef,
  naturalScreenX,
  naturalScreenY,
  naturalScreenWidth,
  naturalScreenHeight,
  children,
  style: customStyle,
  className
}) => {
  const [screenStyle, setScreenStyle] = useState<CSSProperties>({});
  const hasInitializedRef = useRef(false);

  const calculateAndSetScreenPosition = () => {
    const imageElement = imgRef.current;
    
    if (!imageElement || imageElement.naturalWidth === 0 || imageElement.naturalHeight === 0) {
      setScreenStyle({ display: 'none' });
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

    const displayedScreenX = offsetX + (naturalScreenX * scale);
    const displayedScreenY = offsetY + (naturalScreenY * scale);
    const displayedScreenWidth = naturalScreenWidth * scale;
    const displayedScreenHeight = naturalScreenHeight * scale;

    setScreenStyle({
      position: 'absolute',
      left: `${imageElement.offsetLeft + displayedScreenX}px`,
      top: `${imageElement.offsetTop + displayedScreenY}px`,
      width: `${displayedScreenWidth}px`,
      height: `${displayedScreenHeight}px`,
      backgroundColor: 'rgba(173, 216, 230, 0.5)', // Light blue, semi-transparent background
      boxSizing: 'border-box',
      display: 'block',
      userSelect: 'none',
      WebkitUserSelect: 'none',
      MozUserSelect: 'none',
      msUserSelect: 'none',
      zIndex: 1, // Ensure it's below the image
      ...customStyle, // Allow overriding or extending styles
    });
  };

  useLayoutEffect(() => {
    const timer = setTimeout(() => {
      calculateAndSetScreenPosition();
      hasInitializedRef.current = true;
    }, 50);
    
    return () => clearTimeout(timer);
  }, []);

  useEffect(() => {
    const imageElement = imgRef.current;

    // Create ResizeObserver once
    let resizeObserver: ResizeObserver | null = null;
    
    if (imageElement) {
      // Enhanced image loading handler
      const handleImageLoad = () => {
        calculateAndSetScreenPosition();
        
        // Add a sequence of delayed recalculations to ensure correct positioning
        setTimeout(calculateAndSetScreenPosition, 50);
        setTimeout(calculateAndSetScreenPosition, 200);
      };
      
      // Use both onload and complete checks
      if (imageElement.complete && imageElement.naturalWidth > 0) {
        handleImageLoad();
      } else {
        imageElement.onload = handleImageLoad;
      }
      
      // Add a ResizeObserver to detect when the image dimensions actually change
      resizeObserver = new ResizeObserver(() => {
        calculateAndSetScreenPosition();
      });
      
      resizeObserver.observe(imageElement);
    } else {
      setScreenStyle({ display: 'none', ...customStyle });
    }

    window.addEventListener('resize', calculateAndSetScreenPosition);

    return () => {
      window.removeEventListener('resize', calculateAndSetScreenPosition);
      if (imageElement) {
        imageElement.onload = null;
      }
      // Clean up ResizeObserver properly
      if (resizeObserver) {
        resizeObserver.disconnect();
      }
    };
  }, [imgRef, naturalScreenX, naturalScreenY, naturalScreenWidth, naturalScreenHeight, customStyle]);

  if (screenStyle.display === 'none') {
    return null;
  }

  return (
    <div style={screenStyle} className={className}>
      {children}
    </div>
  );
};

export default VirtualScreenOverlay; 