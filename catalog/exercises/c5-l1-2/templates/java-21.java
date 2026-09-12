import java.io.*;
import java.util.*;
import java.text.*;
import java.math.*;
import java.util.regex.*;

class OLed {
    boolean state;

    void switchOn(){
        state = true;
    }

    void switchOff(){
        state = false;
    }

    void draw(){
        if(state){
            System.out.print("(*)");
        } else {
            System.out.print("( )");
        }
    }
}

class LedArray {
    OLed[] leds;

    LedArray(int size){
        leds = new OLed[size];
        for (int i = 0; i < size; i++) {
            leds[i] = new OLed();
        }
    }

    void draw(){
        for(OLed led : leds){
            led.draw();
        }
    }
}


public class Main {

    public static void main(String[] args) {
        Scanner scanner = new Scanner(System.in);

        LedArray ledArray = new LedArray(5);

        int position;
        while((position = scanner.nextInt()) != -1){
            ledArray.switchLed(position);

            ledArray.draw();
            System.out.println();
        }
    }
}