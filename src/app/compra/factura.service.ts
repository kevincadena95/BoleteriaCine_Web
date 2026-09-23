import { Injectable } from "@angular/core";
import { jsPDF } from "jspdf";
import { EntradaUsuario } from "./compra.service";

export interface DatosComprador {
  nombre: string;
  email: string;
}

const DORADO: [number, number, number] = [201, 158, 46];
const DORADO_CLARO: [number, number, number] = [242, 201, 76];
const OSCURO: [number, number, number] = [17, 27, 40];
const GRIS: [number, number, number] = [110, 123, 136];
const GRIS_CLARO: [number, number, number] = [237, 240, 244];
const BLANCO: [number, number, number] = [255, 255, 255];

const LOGO_URL = "assets/logo/logo-micine.png";
const LOGO_RATIO = 1086 / 1448;

@Injectable({ providedIn: "root" })
export class FacturaService {
  private logoDataUrl: string | null | undefined;

  async previsualizar(
    entrada: EntradaUsuario,
    comprador: DatosComprador,
    ventana: Window | null,
  ): Promise<void> {
    const logo = await this.obtenerLogo();
    const doc = this.construirDocumento(entrada, comprador, logo);
    const blob = doc.output("blob");
    const url = URL.createObjectURL(blob);

    if (ventana) {
      ventana.location.href = url;
      setTimeout(() => URL.revokeObjectURL(url), 60_000);
    } else {
      // Pestaña bloqueada por el navegador: recurrimos a la descarga directa.
      doc.save(`factura-${entrada.codigo}.pdf`);
      URL.revokeObjectURL(url);
    }
  }

  private async obtenerLogo(): Promise<string | null> {
    if (this.logoDataUrl !== undefined) return this.logoDataUrl;

    try {
      const respuesta = await fetch(LOGO_URL);
      const blob = await respuesta.blob();

      this.logoDataUrl = await new Promise<string>((resolve, reject) => {
        const lector = new FileReader();
        lector.onload = () => resolve(lector.result as string);
        lector.onerror = () => reject(lector.error);
        lector.readAsDataURL(blob);
      });
    } catch {
      this.logoDataUrl = null;
    }

    return this.logoDataUrl;
  }

  private construirDocumento(
    entrada: EntradaUsuario,
    comprador: DatosComprador,
    logo: string | null,
  ): jsPDF {
    const doc = new jsPDF({ unit: "mm", format: "a4" });
    const margen = 18;
    const anchoPagina = 210;
    const anchoUtil = anchoPagina - margen * 2;
    const colAncho = anchoUtil / 2;
    let y = margen;

    if (logo) {
      const anchoLogo = 32;
      doc.addImage(
        logo,
        "PNG",
        margen,
        y - 3,
        anchoLogo,
        anchoLogo * LOGO_RATIO,
      );
    }

    doc.setFont("helvetica", "bold");
    doc.setFontSize(22);
    doc.setTextColor(...OSCURO);
    doc.text("FACTURA", margen + anchoUtil, y + 6, { align: "right" });

    doc.setFont("helvetica", "normal");
    doc.setFontSize(10);
    doc.setTextColor(...GRIS);
    doc.text(`No. ${entrada.codigo}`, margen + anchoUtil, y + 12, {
      align: "right",
    });
    doc.text(`Estado: ${entrada.estado}`, margen + anchoUtil, y + 17, {
      align: "right",
    });

    y += 26;
    doc.setDrawColor(...DORADO);
    doc.setLineWidth(0.8);
    doc.line(margen, y, margen + anchoUtil, y);
    y += 10;

    doc.setFont("helvetica", "bold");
    doc.setFontSize(9);
    doc.setTextColor(...DORADO);
    doc.text("FACTURADO A", margen, y);
    doc.text("DETALLES DE LA COMPRA", margen + colAncho, y);
    y += 6;

    doc.setFont("helvetica", "bold");
    doc.setFontSize(11);
    doc.setTextColor(...OSCURO);
    doc.text(comprador.nombre || "Cliente Metrópoli Cine", margen, y);
    doc.text(`Fecha de compra: ${entrada.fechaCompra}`, margen + colAncho, y);
    y += 6;

    doc.setFont("helvetica", "normal");
    doc.setFontSize(10);
    doc.setTextColor(...GRIS);
    doc.text(comprador.email, margen, y);
    doc.text(`Código de reserva: ${entrada.codigo}`, margen + colAncho, y);
    y += 14;

    const altoTarjeta = 26;
    doc.setFillColor(...GRIS_CLARO);
    doc.roundedRect(margen, y, anchoUtil, altoTarjeta, 3, 3, "F");

    doc.setFont("helvetica", "bold");
    doc.setFontSize(13);
    doc.setTextColor(...OSCURO);
    doc.text(entrada.pelicula, margen + 6, y + 10);

    doc.setFont("helvetica", "normal");
    doc.setFontSize(9.5);
    doc.setTextColor(...GRIS);
    doc.text(
      `${entrada.fechaFuncion} · ${entrada.hora.slice(0, 5)} · ${entrada.formato} · ${entrada.idioma} · ${entrada.sala}`,
      margen + 6,
      y + 18,
    );

    y += altoTarjeta + 14;

    const subtotalDulceria = entrada.snacks.reduce(
      (total, item) => total + item.subtotal,
      0,
    );
    const subtotalBoletos = entrada.total - subtotalDulceria;

    const colDescripcion = margen;
    const colSubtotal = margen + anchoUtil;
    const colPrecio = colSubtotal - 40;
    const colCantidad = colPrecio - 34;

    doc.setFont("helvetica", "bold");
    doc.setFontSize(9);
    doc.setTextColor(...BLANCO);
    doc.setFillColor(...OSCURO);
    doc.rect(margen, y, anchoUtil, 8, "F");
    doc.text("DESCRIPCIÓN", colDescripcion + 3, y + 5.5);
    doc.text("CANT.", colCantidad, y + 5.5, { align: "center" });
    doc.text("PRECIO UNIT.", colPrecio, y + 5.5, { align: "right" });
    doc.text("SUBTOTAL", colSubtotal - 3, y + 5.5, { align: "right" });
    y += 8;

    const filas: { desc: string; cant: string; precio: string; sub: string }[] =
      [];

    if (entrada.asientos.length > 0) {
      const precioPromedio = subtotalBoletos / entrada.asientos.length;

      filas.push({
        desc: `Entradas de cine · Asientos ${entrada.asientos.join(", ")}`,
        cant: String(entrada.asientos.length),
        precio: this.moneda(precioPromedio),
        sub: this.moneda(subtotalBoletos),
      });
    }

    for (const snack of entrada.snacks) {
      filas.push({
        desc: snack.nombre,
        cant: String(snack.cantidad),
        precio: this.moneda(snack.precioUnitario),
        sub: this.moneda(snack.subtotal),
      });
    }

    doc.setFont("helvetica", "normal");
    doc.setFontSize(9.5);

    filas.forEach((fila, indice) => {
      if (y > 265) {
        doc.addPage();
        y = margen;
      }

      const altoFila = 9;
      if (indice % 2 === 1) {
        doc.setFillColor(...GRIS_CLARO);
        doc.rect(margen, y, anchoUtil, altoFila, "F");
      }

      doc.setTextColor(...OSCURO);
      const descripcion = doc.splitTextToSize(fila.desc, colCantidad - colDescripcion - 8);
      doc.text(descripcion, colDescripcion + 3, y + 6);
      doc.text(fila.cant, colCantidad, y + 6, { align: "center" });
      doc.setTextColor(...GRIS);
      doc.text(fila.precio, colPrecio, y + 6, { align: "right" });
      doc.setTextColor(...OSCURO);
      doc.text(fila.sub, colSubtotal - 3, y + 6, { align: "right" });

      y += altoFila;
    });

    doc.setDrawColor(...GRIS_CLARO);
    doc.setLineWidth(0.4);
    doc.line(margen, y, margen + anchoUtil, y);
    y += 10;

    const anchoTotales = 70;
    const xTotales = margen + anchoUtil - anchoTotales;

    doc.setFont("helvetica", "normal");
    doc.setFontSize(9.5);
    doc.setTextColor(...GRIS);
    doc.text("Subtotal boletos", xTotales, y);
    doc.text(this.moneda(subtotalBoletos), colSubtotal - 3, y, { align: "right" });
    y += 6;

    if (subtotalDulceria > 0) {
      doc.text("Subtotal dulcería", xTotales, y);
      doc.text(this.moneda(subtotalDulceria), colSubtotal - 3, y, {
        align: "right",
      });
      y += 6;
    }

    y += 2;
    doc.setFillColor(...DORADO_CLARO);
    doc.roundedRect(xTotales - 4, y - 5.5, anchoTotales + 4, 11, 2, 2, "F");
    doc.setFont("helvetica", "bold");
    doc.setFontSize(11);
    doc.setTextColor(...OSCURO);
    doc.text("TOTAL", xTotales, y + 1.5);
    doc.text(this.moneda(entrada.total), colSubtotal - 3, y + 1.5, {
      align: "right",
    });

    const yPie = 280;
    doc.setDrawColor(...GRIS_CLARO);
    doc.setLineWidth(0.4);
    doc.line(margen, yPie, margen + anchoUtil, yPie);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(8.5);
    doc.setTextColor(...GRIS);
    doc.text(
      "Gracias por tu compra en Metrópoli Cine · Conserva este comprobante como respaldo de tu compra.",
      anchoPagina / 2,
      yPie + 6,
      { align: "center" },
    );

    return doc;
  }

  private moneda(valor: number): string {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
    }).format(valor);
  }
}
