import java.util.Scanner;


class Producte {
    String nom;
    String descripcio;
    float preu;
    int stock;
}

public class Main {

    public static void main(String[] args) {
        Scanner scanner = new Scanner(System.in);

        Producte producte = new Producte();

        // escriu aqui el codi

        System.out.println("Nom:        " + producte.nom);
        System.out.println("Descripcio: " + producte.descripcio);
        System.out.println("Preu:       " + producte.preu);
        System.out.println("Stock:      " + producte.stock);
    }
}