"use client"

import { HttpTypes } from "@medusajs/types"
import { Container } from "@modules/common/components/ui"
import Image from "next/image"
import { useState, useEffect } from "react"

type ImageGalleryProps = {
  images: HttpTypes.StoreProductImage[]
}

const ImageGallery = ({ images }: ImageGalleryProps) => {
  const [activeImageIndex, setActiveImageIndex] = useState(0)

  // Reset active image when images set changes (e.g. variant change)
  useEffect(() => {
    setActiveImageIndex(0)
  }, [images])

  if (!images || images.length === 0) {
    return null
  }

  return (
    <div className="flex flex-col gap-y-4 w-full">
      {/* Main Image Viewer */}
      <div className="flex flex-col flex-1 small:mx-16 gap-y-4">
        <Container
          className="relative aspect-[29/34] w-full overflow-hidden bg-ui-bg-subtle"
        >
          {!!images[activeImageIndex]?.url && (
            <Image
              src={images[activeImageIndex].url}
              priority={true}
              className="absolute inset-0 rounded-rounded transition-all duration-300"
              alt={`Product image ${activeImageIndex + 1}`}
              fill
              sizes="(max-width: 576px) 280px, (max-width: 768px) 360px, (max-width: 992px) 480px, 800px"
              style={{
                objectFit: "cover",
              }}
            />
          )}
        </Container>

        {/* Thumbnail Row - Amazon Style */}
        {images.length > 1 && (
          <div className="flex flex-row gap-x-2 overflow-x-auto pb-2 scrollbar-hide justify-center">
            {images.map((image, index) => {
              return (
                <button
                  key={image.id}
                  onClick={() => setActiveImageIndex(index)}
                  className={`relative w-20 h-24 flex-shrink-0 rounded-md overflow-hidden border-2 transition-all ${
                    activeImageIndex === index 
                      ? "border-black" 
                      : "border-transparent opacity-60 hover:opacity-100"
                  }`}
                >
                  {!!image.url && (
                    <Image
                      src={image.url}
                      className="absolute inset-0"
                      alt={`Thumbnail ${index + 1}`}
                      fill
                      sizes="80px"
                      style={{
                        objectFit: "cover",
                      }}
                    />
                  )}
                </button>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}

export default ImageGallery
