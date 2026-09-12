import java.io.*;
import java.util.*;
import java.text.*;
import java.math.*;
import java.util.regex.*;


class Casella {
    char lletra;

    Casella(char lletra){
        // escriu el codi aqui
    }
}

class Columna {
    Casella casella;

    Columna(char lletra){
        // escriu el codi aqui
    }
}

class Fila {
    Columna[] columnes;

    Fila(int nColumnes, char lletra){
        // escriu el codi aqui
    }
}

class Taula {
    Fila[] files;

    Taula(int nFiles, int nColumnes, char lletra){
        // escriu el codi aqui
    }
}
public class Main {

    public static void main(String[] args) {
        Scanner scanner = new Scanner(System.in);

        Taula taula = new Taula(scanner.nextInt(), scanner.nextInt(), scanner.next().charAt(0));

        for (int i = 0; i < taula.files.length; i++) {
            for (int j = 0; j < taula.files[i].columnes.length; j++) {
                System.out.print(taula.files[i].columnes[j].casella.lletra);
            }
            System.out.println();
        }
    }
}