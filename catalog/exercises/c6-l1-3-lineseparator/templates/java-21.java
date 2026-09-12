import java.io.*;
import java.util.*;
import java.text.*;
import java.math.*;
import java.util.regex.*;

class LineSeparator {
    int size;

    void print(){
        for (int i = 0; i < size; i++) {
            System.out.print("-");
        }
        System.out.println();
    }
}

public class Main {

    public static void main(String[] args) {
        Scanner scanner = new Scanner(System.in);

        int n;
        while((n = scanner.nextInt()) != -1){
            System.out.format("Aqui sota hi surt una line de %d guions", n);
            lineSeparator.print();
        }
    }
}