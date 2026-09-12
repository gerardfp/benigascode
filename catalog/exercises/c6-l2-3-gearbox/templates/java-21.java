import java.io.*;
import java.util.*;
import java.text.*;
import java.math.*;
import java.util.regex.*;

class GearBox {
    int gear;
    int numGears;

    void show(){
        System.out.print("Current gear: ");

        switch (gear){
            case -1:
                System.out.println("R");
                break;
            case 0:
                System.out.println("N");
                break;
            default:
                System.out.println(gear);
        }
    }
}

public class Main {

    public static void main(String[] args) {
        Scanner scanner = new Scanner(System.in);

	    GearBox gearBox = new GearBox();
        gearBox.numGears = scanner.nextInt();
        scanner.nextLine();

        String action;
        while(!(action = scanner.nextLine()).equals("__END__")){
            switch (action){
                case "UP":
                    gearBox.gearUp();
                    break;
                case "DOWN":
                    gearBox.gearDown();
                    break;
            }
            gearBox.show();
        }
    }
}