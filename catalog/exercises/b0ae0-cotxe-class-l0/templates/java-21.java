import java.io.*;
import java.util.*;
import java.text.*;
import java.math.*;
import java.util.regex.*;


class Car {
    String model;
    int topSpeed;
    float acceleration;
    float braking;
    float cornering;

    // escriu el codi aqui
}

public class Main {

    public static void main(String[] args) {
        Scanner scanner = new Scanner(System.in);
        scanner.useLocale(Locale.US);

        int numCars = scanner.nextInt();
        scanner.nextLine();

        Car[] cars = new Car[numCars];

        for (int i = 0; i < numCars; i++) {
            cars[i] = new Car(scanner.nextLine(), scanner.nextInt(), scanner.nextFloat(), scanner.nextFloat(), scanner.nextFloat());
            scanner.nextLine();
        }

        Arrays.sort(cars, Comparator.comparingInt(a -> -a.topSpeed));
        for (int i = 0; i < numCars; i++) {
            System.out.format("%-20s  %4d  %4.2f  %4.2f  %4.2f %n", cars[i].model, cars[i].topSpeed, cars[i].acceleration, cars[i].braking, cars[i].cornering);
        }
    }
}