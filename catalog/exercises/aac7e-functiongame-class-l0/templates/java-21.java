import java.io.*;
import java.util.*;
import java.text.*;
import java.math.*;
import java.util.regex.*;

class FunctionGame {
  
  // escriu el codi aqui

}

public class Main {

    public static void main(String[] args) {
        Scanner scanner = new Scanner(System.in);

        FunctionGame functionGame = new FunctionGame();

        String functionName = scanner.next();

        if("function1".equals(functionName)){
            for (int i = 5; i-->0;) {
                int param = scanner.nextInt();
                int returnValue = functionGame.function1(param);
                System.out.println(param + " -> " + returnValue);
            }
        } else if("function2".equals(functionName)){
            for (int i = 5; i-->0;) {
                int param = scanner.nextInt();
                int returnValue = functionGame.function2(param);
                System.out.println(param + " -> " + returnValue);
            }
        } else if("function3".equals(functionName)){
            for (int i = 5; i-->0;) {
                int param = scanner.nextInt();
                int returnValue = functionGame.function3(param);
                System.out.println(param + " -> " + returnValue);
            }
        } else if("function4".equals(functionName)){
            for (int i = 5; i-->0;) {
                int param = scanner.nextInt();
                int returnValue = functionGame.function4(param);
                System.out.println(param + " -> " + returnValue);
            }
        } else if("function5".equals(functionName)){
            for (int i = 5; i-->0;) {
                int param = scanner.nextInt();
                int returnValue = functionGame.function5(param);
                System.out.println(param + " -> " + returnValue);
            }
        }  else if("function6".equals(functionName)){
            for (int i = 5; i-->0;) {
                int param1 = scanner.nextInt();
                int param2 = scanner.nextInt();
                int returnValue = functionGame.function6(param1, param2);
                System.out.println(param1 + "," + param2 + " -> " + returnValue);
            }
        } else if("function7".equals(functionName)){
            for (int i = 7; i-->0;) {
                int param1 = scanner.nextInt();
                int param2 = scanner.nextInt();
                int returnValue = functionGame.function7(param1, param2);
                System.out.println(param1 + "," + param2 + " -> " + returnValue);
            }
        } else if("function8".equals(functionName)){
            for (int i = 7; i-->0;) {
                int param1 = scanner.nextInt();
                int param2 = scanner.nextInt();
                int param3 = scanner.nextInt();
                int returnValue = functionGame.function8(param1, param2, param3);
                System.out.println(param1 + "," + param2 + "," + param3 + " -> " + returnValue);
            }
        }
    }
}