import React, { useState, useEffect } from 'react';
import { isIndexedDbMedia, resolveMediaUrl } from '../services/indexedDbMedia';

interface MediaImageProps extends React.ImgHTMLAttributes<HTMLImageElement> {
  src?: string;
  fallbackSrc?: string;
}

/**
 * 通用无缝媒体图像组件
 * 支持常规网络 URL、Base64 数据以及 IndexedDB 本地虚拟 URI (idb://)
 * 自带防破图保护，杜绝浏览器原生破损图标与 alt 文本溢出
 */
export const MediaImage: React.FC<MediaImageProps> = ({
  src,
  fallbackSrc = 'https://images.unsplash.com/photo-1517604931442-7e0c8ed2963c?w=500&auto=format&fit=crop&q=80',
  alt = '',
  className = '',
  ...props
}) => {
  const [resolvedUrl, setResolvedUrl] = useState<string>(() => {
    if (!src) return fallbackSrc;
    if (isIndexedDbMedia(src)) return '';
    return src;
  });

  const [hasError, setHasError] = useState(false);

  useEffect(() => {
    let isMounted = true;
    setHasError(false);

    if (!src) {
      setResolvedUrl(fallbackSrc);
      return;
    }

    if (isIndexedDbMedia(src)) {
      resolveMediaUrl(src)
        .then((url) => {
          if (isMounted) {
            setResolvedUrl(url || fallbackSrc);
          }
        })
        .catch(() => {
          if (isMounted) {
            setResolvedUrl(fallbackSrc);
          }
        });
    } else {
      setResolvedUrl(src);
    }

    return () => {
      isMounted = false;
    };
  }, [src, fallbackSrc]);

  if (hasError || !resolvedUrl) {
    return (
      <div className={`bg-[#FAF8F5] dark:bg-black/30 flex items-center justify-center overflow-hidden ${className}`}>
        {fallbackSrc && !hasError ? (
          <img
            src={fallbackSrc}
            alt=""
            className={`w-full h-full object-cover opacity-60 ${className}`}
          />
        ) : (
          <div className="w-full h-full bg-[#5B7B6D]/5" />
        )}
      </div>
    );
  }

  return (
    <img
      src={resolvedUrl}
      alt=""
      className={className}
      onError={() => {
        setHasError(true);
      }}
      {...props}
    />
  );
};
