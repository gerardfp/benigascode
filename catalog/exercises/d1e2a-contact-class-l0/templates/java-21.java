import java.util.Scanner;

class Direccion {
    String calle;
    String codPostal;
    String ciudad;
    String provincia;
}

class Contacto {
    String nombre;
    String apellidos;
    Direccion direccion;
}

public class Main {

    public static void main(String[] args) {
        Scanner scanner = new Scanner(System.in);

        Contacto contacto = new Contacto();
      
        contacto.direccion = new Direccion();

		// escriu aqui el codi

        System.out.println(contacto.apellidos + ", " + contacto.nombre);
        System.out.println(contacto.direccion.calle);
        System.out.println(contacto.direccion.codPostal + " - " + contacto.direccion.ciudad);
        System.out.println(contacto.direccion.provincia);
    }
}