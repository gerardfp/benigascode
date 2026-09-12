import java.io.*;
import java.util.*;
import java.text.*;
import java.math.*;
import java.util.regex.*;

class Producto {
    String descripcion;
    float precio;

    Producto(String descripcion, float precio) {
        this.descripcion = descripcion;
        this.precio = precio;
    }

    public String toString() {
        // escriu el codi aqui
    }
}

class Descuento {
    float valor;

    Descuento(float valor) {
        this.valor = valor;
    }

  	// escriu el codi aqui
}

public class Main {

    public static void main(String[] args) {
        Scanner scanner = new Scanner(System.in);
        scanner.useLocale(Locale.US);

        Producto producto = new Producto(scanner.next(), scanner.nextFloat());

        System.out.println(producto);

        Descuento descuento = new Descuento(scanner.nextFloat());

        descuento.aplicar(producto);

        System.out.println(producto);
    }
}