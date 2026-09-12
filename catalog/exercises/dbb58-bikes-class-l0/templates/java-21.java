import java.io.*;
import java.util.*;
import java.text.*;
import java.math.*;
import java.util.regex.*;


class Bike {
    int speed;

    public Bike(int speed) {
        this.speed = speed;
    }
}

class Race {
    Bike[] bikes;

  	// escriu el codi aqui

}

public class Main {

    public static void main(String[] args) {
        Scanner scanner = new Scanner(System.in);

        Race race = new Race();

        int numBikes = scanner.nextInt();
      
        race.bikes = new Bike[numBikes];

        for (int i = 0; i < numBikes; i++) {
            race.bikes[i] = new Bike(scanner.nextInt());
        }

        Bike fastest = race.fastest();

        System.out.println(fastest == null ? "No bikes" : fastest.speed);
    }
}