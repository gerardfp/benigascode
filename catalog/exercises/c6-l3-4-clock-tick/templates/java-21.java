import java.io.*;
import java.util.*;
import java.text.*;
import java.math.*;
import java.util.regex.*;

class Clock {
    int hours;
    int minutes;
    int seconds;

}

public class E12 {

    public static void main(String[] args) {
        Scanner scanner = new Scanner(System.in);
        Clock clock = new Clock();

        int t;
        while((t = scanner.nextInt()) != -1){
            if(t == 0) clock.reset();
            else for (int i = 0; i < t; i++) clock.tick();
            System.out.println(clock.getTime());
        }
    }
}