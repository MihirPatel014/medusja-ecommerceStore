import { Metadata } from "next"
import { notFound } from "next/navigation"
import { listProducts } from "@lib/data/products"
import { getRegion, listRegions } from "@lib/data/regions"
import ProductTemplate from "@modules/products/templates"
import { HttpTypes } from "@medusajs/types"

type Props = {
  params: Promise<{ countryCode: string; handle: string }>
  searchParams: Promise<{ v_id?: string }>
}

export async function generateStaticParams() {
  try {
    const countryCodes = await listRegions().then((regions) =>
      regions?.map((r) => r.countries?.map((c) => c.iso_2)).flat()
    )

    if (!countryCodes) {
      return []
    }

    const promises = countryCodes.map(async (country) => {
      const { response } = await listProducts({
        countryCode: country,
        queryParams: { limit: 100, fields: "handle" },
      })

      return {
        country,
        products: response.products,
      }
    })

    const countryProducts = await Promise.all(promises)

    return countryProducts
      .flatMap((countryData) =>
        countryData.products.map((product) => ({
          countryCode: countryData.country,
          handle: product.handle,
        }))
      )
      .filter((param) => param.handle)
  } catch (error) {
    console.error(
      `Failed to generate static paths for product pages: ${
        error instanceof Error ? error.message : "Unknown error"
      }.`
    )
    return []
  }
}

function getImagesForVariant(
  product: HttpTypes.StoreProduct,
  selectedVariantId?: string
) {
  if (!product.images || product.images.length === 0) {
    return []
  }

  if (!selectedVariantId || !product.variants) {
    return product.images
  }

  const variant = product.variants.find((v) => v.id === selectedVariantId)
  if (!variant) {
    return product.images
  }

  // 1. Priority: Explicit variant-image associations
  if (variant.images && variant.images.length > 0) {
    const imageIdsMap = new Map(variant.images.map((i) => [i.id, true]))
    return product.images.filter((i) => imageIdsMap.has(i.id))
  }

  // 2. Heuristic: Match by Color option
  const colorOption = product.options?.find(
    (o) => o.title?.toLowerCase() === "color"
  )
  const colorValue = variant.options
    ?.find((o) => o.option_id === colorOption?.id)
    ?.value?.toLowerCase()

  if (colorValue) {
    const filtered = product.images.filter((img) =>
      img.url?.toLowerCase().includes(colorValue)
    )
    if (filtered.length > 0) {
      return filtered
    }
  }

  // 3. Heuristic: Match by any option value longer than 2 chars (e.g. "Black", "White")
  const candidates =
    variant.options
      ?.map((o) => o.value?.toLowerCase())
      .filter((v): v is string => !!v && v.length > 2) || []

  // Add variant title parts as candidates
  if (variant.title) {
    const titleParts = variant.title.toLowerCase().split(/[\/\s-]+/)
    candidates.push(...titleParts.filter((p) => p.length > 2))
  }

  if (candidates.length > 0) {
    const filtered = product.images.filter((img) => {
      const url = img.url?.toLowerCase() || ""
      return candidates.some((val) => url.includes(val))
    })

    if (filtered.length > 0) {
      return filtered
    }
  }

  // Fallback: Return all images
  return product.images
}

export async function generateMetadata(props: Props): Promise<Metadata> {
  const params = await props.params
  const { handle } = params
  const region = await getRegion(params.countryCode)

  if (!region) {
    notFound()
  }

  const product = await listProducts({
    countryCode: params.countryCode,
    queryParams: { handle },
  }).then(({ response }) => response.products[0])

  if (!product) {
    notFound()
  }

  return {
    title: `${product.title} | Medusa Store`,
    description: `${product.title}`,
    openGraph: {
      title: `${product.title} | Medusa Store`,
      description: `${product.title}`,
      images: product.thumbnail ? [product.thumbnail] : [],
    },
  }
}

export default async function ProductPage(props: Props) {
  const params = await props.params
  const region = await getRegion(params.countryCode)
  const searchParams = await props.searchParams

  const selectedVariantId = searchParams.v_id

  if (!region) {
    notFound()
  }

  const pricedProduct = await listProducts({
    countryCode: params.countryCode,
    queryParams: { handle: params.handle },
  }).then(({ response }) => response.products[0])

  if (!pricedProduct) {
    notFound()
  }

  const images = getImagesForVariant(pricedProduct, selectedVariantId)

  return (
    <ProductTemplate
      product={pricedProduct}
      region={region}
      countryCode={params.countryCode}
      images={images ?? []}
    />
  )
}
