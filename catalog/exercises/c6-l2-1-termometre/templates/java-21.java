import java.io.*;
import java.util.*;
import java.text.*;
import java.math.*;
import java.util.regex.*;

class Thermometer {
    float celsius;
  
}


public class Main {

    public static void main(String[] args) {
        Scanner scanner = new Scanner(System.in);

        Thermometer thermometer1 = new Thermometer();
        Thermometer thermometer2 = new Thermometer();

        float a, b;
        while((a = scanner.nextFloat()) >= -273.1f) {
            thermometer1.celsius = a;
            thermometer2.celsius = scanner.nextFloat();

            System.out.println("Termometre 1");
            thermometer1.printCelsius();
            thermometer1.printFahrenheit();
            thermometer1.printKelvin();

            System.out.println("Termometre 2");
            thermometer2.printCelsius();
            thermometer2.printFahrenheit();
            thermometer2.printKelvin();
          
            System.out.println("--------");
        }
    }
}