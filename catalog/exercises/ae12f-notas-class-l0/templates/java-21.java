import java.io.*;
import java.util.*;
import java.text.*;
import java.math.*;
import java.util.regex.*;


// escriu el codi aqui

public class Main {

    public static void main(String[] args) {
		Scanner scanner = new Scanner(System.in);
      
      	Alumno alumno = new Alumno();

      	int numeroNotas = scanner.nextInt();
      
      	alumno.notas = new float[numeroNotas];
      
        for(int i=0; i<numeroNotas; i++){
         	alumno.notas[i] = scanner.nextFloat();
        }
      
        float suma = 0;
        for(int i=0; i<numeroNotas; i++){
        	suma += alumno.notas[i];
        }
      
        System.out.println("Nota media: " + suma/numeroNotas);
    }
}