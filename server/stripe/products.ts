/**
 * Stripe Products and Prices Configuration
 * Define all credit packages here for centralized management
 */

export const CREDIT_PACKAGES = [
  {
    id: "credits_10",
    name: "10 Credits",
    credits: 10,
    price: 999, // $9.99 in cents
    description: "Perfect for trying out bulk analysis",
  },
  {
    id: "credits_50",
    name: "50 Credits",
    credits: 50,
    price: 3999, // $39.99 in cents
    description: "Best value for regular users",
    popular: true,
  },
  {
    id: "credits_100",
    name: "100 Credits",
    credits: 100,
    price: 7999, // $79.99 in cents
    description: "For power users and agencies",
  },
];

export function getCreditPackage(packageId: string) {
  return CREDIT_PACKAGES.find((pkg) => pkg.id === packageId);
}
