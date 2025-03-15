// This is a mock implementation - in a real app, you would fetch data from an API or database

// Mock data for recently tracked products
export async function fetchLatestProducts() {
  return [
    {
      id: "1",
      name: "AMD Ryzen 7 5800X Processor",
      image: "/placeholder.svg?height=192&width=384",
      currentPrice: 299.99,
      previousPrice: 349.99,
      percentageChange: -14.29,
      store: "venex.com.ar",
      lastUpdated: "Today, 2:30 PM",
      url: "https://www.venex.com.ar/processors/amd",
    },
    {
      id: "2",
      name: "NVIDIA GeForce RTX 3080 Graphics Card",
      image: "/placeholder.svg?height=192&width=384",
      currentPrice: 799.99,
      previousPrice: 699.99,
      percentageChange: 14.29,
      store: "venex.com.ar",
      lastUpdated: "Yesterday, 10:15 AM",
      url: "https://www.venex.com.ar/graphics-cards/nvidia",
    },
    {
      id: "3",
      name: "Samsung 1TB 980 PRO SSD",
      image: "/placeholder.svg?height=192&width=384",
      currentPrice: 149.99,
      previousPrice: 149.99,
      percentageChange: 0,
      store: "venex.com.ar",
      lastUpdated: "2 days ago",
      url: "https://www.venex.com.ar/storage/ssd",
    },
  ];
}

// Mock function to get product details
export async function getProductDetails(id: string) {
  const products = await fetchLatestProducts();
  const product = products.find((p) => p.id === id);

  if (!product) {
    throw new Error(`Product with ID ${id} not found`);
  }

  return product;
}

// Mock function to get price history for a product
export async function getProductPriceHistory(id: string) {
  // Generate mock price history data
  const today = new Date();
  const history = [];

  // Get the product to use its current price as a reference
  const product = await getProductDetails(id);
  let basePrice = product.currentPrice;

  // Generate data for the last 30 days
  for (let i = 30; i >= 0; i--) {
    const date = new Date(today);
    date.setDate(date.getDate() - i);

    // Add some random variation to create a realistic price history
    // More variation for older dates
    const randomFactor = 1 + (Math.random() * 0.2 - 0.1) * (i / 15);
    const price = basePrice * randomFactor;

    history.push({
      date: date.toISOString(),
      price: Math.round(price * 100) / 100,
    });

    // Occasionally update the base price to create price jumps
    if (i % 7 === 0) {
      basePrice = price;
    }
  }

  return history;
}
