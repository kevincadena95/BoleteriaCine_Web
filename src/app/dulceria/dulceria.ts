import { Component, signal, computed, inject } from "@angular/core";
import { CommonModule } from "@angular/common";
import { Router } from "@angular/router";
import { CompraService } from "../compra/compra.service";
import { AuthService } from "../login/auth.service";
import { LoginRequerido } from "../login-requerido/login-requerido";

export type ProductCategory = "combo" | "individual";
export type FilterCategory = "todos" | ProductCategory;

export interface Product {
  id: number;
  name: string;
  description: string;
  price: number;
  category: ProductCategory;
  image: string;
}

export interface CartItem {
  product: Product;
  quantity: number;
}

@Component({
  selector: "app-dulceria",
  standalone: true,
  imports: [CommonModule, LoginRequerido],
  templateUrl: "./dulceria.html",
  styleUrls: ["./dulceria.css"],
})
export class Dulceria {
  private router = inject(Router);
  private compraService = inject(CompraService);
  private auth = inject(AuthService);

  readonly products: Product[] = [
    // Combos
    {
      id: 1,
      name: "Combo 1",
      description: "Palomitas de maíz, 1 bebida y hot dog.",
      price: 13.0,
      category: "combo",
      image: "/assets/dulceria/combo-1.png",
    },
    {
      id: 2,
      name: "Combo 2",
      description: "Palomitas de maíz, 1 bebida y nachos con queso.",
      price: 15.0,
      category: "combo",
      image: "/assets/dulceria/combo-2.png",
    },
    {
      id: 3,
      name: "Combo 3",
      description: "Palomitas de maíz, 2 bebidas, hot dog y nachos con queso.",
      price: 23.0,
      category: "combo",
      image: "/assets/dulceria/combo-3.png",
    },
    {
      id: 4,
      name: "Combo 4",
      description: "Palomitas de maíz grandes con 2 bebidas.",
      price: 19.0,
      category: "combo",
      image: "/assets/dulceria/combo-4.png",
    },

    // Bebidas e Individuales
    {
      id: 5,
      name: "Bebida Pequeña",
      description: "Refresco helado vaso azul 22 oz.",
      price: 3.5,
      category: "individual",
      image: "/assets/dulceria/bebida-pequena.png",
    },
    {
      id: 6,
      name: "Bebida Grande",
      description: "Refresco helado vaso rojo 32 oz.",
      price: 4.5,
      category: "individual",
      image: "/assets/dulceria/bebida-grande.png",
    },
    {
      id: 7,
      name: "Café",
      description: "Café caliente servido en vaso Nescafé.",
      price: 3.0,
      category: "individual",
      image: "/assets/dulceria/cafe.jpg",
    },
    {
      id: 8,
      name: "Agua Sin Gas",
      description: "Botella de agua Dasani sin gas 600 ml.",
      price: 2.5,
      category: "individual",
      image: "/assets/dulceria/agua-sin-gas.jpg",
    },

    // Dulces
    {
      id: 9,
      name: "Tic Tac Naranja",
      description: "Pastillas de caramelo sabor naranja 16g.",
      price: 2.0,
      category: "individual",
      image: "/assets/dulceria/tic-tac.jpg",
    },
    {
      id: 10,
      name: "Gomas Trolli Sour Octopus",
      description: "Caramelos de goma ácida en forma de pulpo 100g.",
      price: 3.5,
      category: "individual",
      image: "/assets/dulceria/gomas-trolli.jpg",
    },
    {
      id: 11,
      name: "Hershey's Milk Chocolate",
      description: "Barra de chocolate con leche de 43g.",
      price: 3.0,
      category: "individual",
      image: "/assets/dulceria/hersheys.jpg",
    },
    {
      id: 12,
      name: "M&M's Milk Chocolate",
      description: "Confites de chocolate con leche rellenos.",
      price: 3.0,
      category: "individual",
      image: "/assets/dulceria/mnm.jpg",
    },
  ];

  activeFilter = signal<FilterCategory>("todos");
  cartItems = signal<CartItem[]>([]);
  mostrarLoginRequerido = signal(false);

  filteredProducts = computed(() => {
    const filter = this.activeFilter();
    if (filter === "todos") return this.products;
    return this.products.filter((p) => p.category === filter);
  });

  cartTotal = computed(() =>
    this.cartItems().reduce(
      (sum, item) => sum + item.product.price * item.quantity,
      0,
    ),
  );

  cartCount = computed(() =>
    this.cartItems().reduce((sum, item) => sum + item.quantity, 0),
  );

  setFilter(filter: FilterCategory): void {
    this.activeFilter.set(filter);
  }

  getItemQuantity(productId: number): number {
    return (
      this.cartItems().find((i) => i.product.id === productId)?.quantity ?? 0
    );
  }

  addToCart(product: Product): void {
    this.cartItems.update((items) => {
      const existing = items.find((i) => i.product.id === product.id);
      if (existing) {
        return items.map((i) =>
          i.product.id === product.id ? { ...i, quantity: i.quantity + 1 } : i,
        );
      }
      return [...items, { product, quantity: 1 }];
    });
  }

  removeFromCart(productId: number): void {
    this.cartItems.update((items) => {
      const existing = items.find((i) => i.product.id === productId);
      if (!existing) return items;
      if (existing.quantity === 1) {
        return items.filter((i) => i.product.id !== productId);
      }
      return items.map((i) =>
        i.product.id === productId ? { ...i, quantity: i.quantity - 1 } : i,
      );
    });
  }

  removeItemCompletely(productId: number): void {
    this.cartItems.update((items) =>
      items.filter((i) => i.product.id !== productId),
    );
  }

  clearCart(): void {
    this.cartItems.set([]);
  }

  onImageError(event: Event): void {
    const img = event.target as HTMLImageElement;
    img.onerror = null;
    img.style.display = "none";
  }

  async continuarAConfirmacion(): Promise<void> {
    const perfil = await this.auth.obtenerPerfil();

    if (!perfil) {
      this.mostrarLoginRequerido.set(true);
      return;
    }

    this.compraService.guardarDulceria(
      this.cartItems().map((item) => ({
        id: item.product.id,
        nombre: item.product.name,
        cantidad: item.quantity,
        precioUnitario: item.product.price,
      })),
    );

    await this.router.navigate(["/confirmacion"]);
  }

  cerrarLoginRequerido(): void {
    this.mostrarLoginRequerido.set(false);
  }
}
