import java.io.*;
import java.util.*;
import java.text.*;
import java.math.*;
import java.util.regex.*;


// escriu el codi aqui

public class Main {

    public static void main(String[] args) {
      
        Enemy guerrero = new Enemy("guerrero");
        Enemy amazona = new Enemy("amazona");
        Enemy brujo = new Enemy("brujo");

        System.out.println("GUERRERO  " +
                "Health: " + guerrero.health.value + "/" + guerrero.health.max + "   " +
                "Weapon: " + guerrero.weapon.value + "/" + guerrero.weapon.max);

        System.out.println("AMAZONA   " +
                "Health: " + amazona.health.value + "/" + amazona.health.max + "   " +
                "Weapon: " + amazona.weapon.value + "/" + amazona.weapon.max);

        System.out.println("BRUJO     " +
                "Health: " + brujo.health.value + "/" + brujo.health.max + "   " +
                "Weapon: " + brujo.weapon.value + "/" + brujo.weapon.max);
    }
}